// ============================================================
// src/lib/offline.ts — وضع العمل دون اتصال (اختياري ومعزول)
//
// مبادئ السلامة (مصمَّمة لمنع أي تعارض مع قاعدة البيانات):
//  1. معطَّل افتراضياً — لا يعمل شيء إطلاقاً حتى يفعّله المستخدم بنفسه.
//  2. عند الاتصال: كل شيء يمر للسيرفر كالمعتاد تماماً (passthrough)
//     مع حفظ نسخة قراءة محلية فقط بعد نجاح الطلب.
//  3. عند الانقطاع:
//     - القراءة: تُعرض آخر نسخة محفوظة (للعرض فقط).
//     - الإضافة (insert) فقط: تُوضع في طابور وتُرسل عند عودة الاتصال.
//       الإضافات لا تسبب تعارضات لأنها سجلات جديدة بمعرّفات يولّدها السيرفر.
//     - التعديل والحذف: مرفوضان دون اتصال (هما مصدر التعارضات) وتظهر
//       رسالة واضحة للمستخدم.
//  4. زر إيقاف فوري: تعطيل الميزة يعيد التطبيق لسلوكه الأصلي حرفياً
//     (يُصبح العميل هو عميل Supabase الأصلي نفسه دون أي وسيط).
//  5. كامل الكود معزول في هذا الملف + مكوّن الواجهة؛ حذفهما مع سطرين
//     في supabase.ts يزيل الميزة نهائياً.
// ============================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

const FLAG_KEY   = "nabd_offline_enabled";
const CACHE_KEY  = "nabd_offline_cache_v1";
const OUTBOX_KEY = "nabd_offline_outbox_v1";
const MAX_CACHE_ENTRIES = 60;

// ── الحالة والأحداث ─────────────────────────────────────────
export function isOfflineFeatureEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem(FLAG_KEY) === "1"; } catch { return false; }
}

/**
 * يجلب مفتاح التفعيل من السيرفر (يتحكم به الأدمن) ويخزّنه محلياً.
 * إن تغيّرت القيمة يُعاد تحميل الصفحة مرة واحدة لتطبيقها.
 */
export async function refreshOfflineFlag(client: any): Promise<void> {
  try {
    const { data } = await client.from("app_flags").select("value").eq("key", "offline_enabled").maybeSingle();
    const server = data?.value === "1" ? "1" : "0";
    const local = localStorage.getItem(FLAG_KEY) === "1" ? "1" : "0";
    if (server !== local) {
      if (server === "1") localStorage.setItem(FLAG_KEY, "1");
      else { localStorage.removeItem(FLAG_KEY); }
      window.location.reload();
    }
  } catch { /* بلا اتصال أو خطأ — نبقي الحالة الحالية */ }
}

export function wipeOfflineData(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(OUTBOX_KEY);
  } catch { /* ignore */ }
  emit();
}

function emit() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nabd-offline-change"));
  }
}

// ── التخزين ─────────────────────────────────────────────────
type CacheMap = Record<string, { data: unknown; at: number }>;
type OutboxItem = { id: string; table: string; values: Record<string, unknown>[]; at: number };

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function writeJSON(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota — نتجاهل بأمان */ }
}

function cacheGet(k: string): unknown | undefined {
  const c = readJSON<CacheMap>(CACHE_KEY, {});
  return c[k]?.data;
}

function cacheSet(k: string, data: unknown): void {
  const c = readJSON<CacheMap>(CACHE_KEY, {});
  c[k] = { data, at: Date.now() };
  const keys = Object.keys(c);
  if (keys.length > MAX_CACHE_ENTRIES) {
    keys.sort((a, b) => c[a].at - c[b].at)
      .slice(0, keys.length - MAX_CACHE_ENTRIES)
      .forEach(old => { delete c[old]; });
  }
  writeJSON(CACHE_KEY, c);
}

export function getOutbox(): OutboxItem[] {
  return readJSON<OutboxItem[]>(OUTBOX_KEY, []);
}

function pushOutbox(item: OutboxItem): void {
  const q = getOutbox();
  q.push(item);
  writeJSON(OUTBOX_KEY, q);
  emit();
}

function setOutbox(q: OutboxItem[]): void {
  writeJSON(OUTBOX_KEY, q);
  emit();
}

export function pendingCount(): number {
  return getOutbox().length;
}

// ── المزامنة عند عودة الاتصال ───────────────────────────────
let syncing = false;

export async function syncOutbox(realClient: any): Promise<{ sent: number; failed: number }> {
  if (syncing) return { sent: 0, failed: 0 };
  syncing = true;
  let sent = 0, failed = 0;
  try {
    let q = getOutbox();
    for (const item of [...q]) {
      try {
        const { error } = await realClient.from(item.table).insert(item.values);
        if (error) { failed++; continue; }
        q = q.filter(x => x.id !== item.id);
        setOutbox(q);
        sent++;
      } catch {
        failed++;
        break; // لا يزال الاتصال غير مستقر — نتوقف ونحاول لاحقاً
      }
    }
  } finally {
    syncing = false;
    emit();
  }
  return { sent, failed };
}

// ── الغلاف حول عميل Supabase ────────────────────────────────
const OFFLINE_MSG = "أنت غير متصل بالإنترنت — التعديل والحذف يتطلبان اتصالاً (الإضافة الجديدة تُحفظ وتُرسل تلقائياً عند عودة الاتصال).";

function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

function isNetworkError(e: unknown): boolean {
  const msg = String((e as { message?: string })?.message ?? e ?? "");
  return /fetch|network|Failed to|NetworkError|timeout/i.test(msg);
}

class OfflineQuery {
  private real: any;
  private table: string;
  private op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private insertValues: Record<string, unknown>[] | null = null;
  private keyParts: string[];
  private client: any;

  constructor(client: any, table: string) {
    this.client = client;
    this.real = client.from(table);
    this.table = table;
    this.keyParts = [table];
  }

  private forward(method: string, args: unknown[]): this {
    if (method === "insert") {
      this.op = "insert";
      const v = args[0];
      this.insertValues = Array.isArray(v) ? (v as Record<string, unknown>[]) : [v as Record<string, unknown>];
    } else if (method === "update") this.op = "update";
    else if (method === "delete") this.op = "delete";
    else if (method === "upsert") this.op = "upsert";

    try { this.real = this.real[method](...args); } catch { /* يُلتقط عند التنفيذ */ }
    this.keyParts.push(`${method}:${safeStr(args)}`);
    return this;
  }

  // الطرق الشائعة في المشروع — كلها تُمرَّر للعميل الأصلي كما هي
  select(...a: unknown[])      { return this.forward("select", a); }
  insert(...a: unknown[])      { return this.forward("insert", a); }
  update(...a: unknown[])      { return this.forward("update", a); }
  upsert(...a: unknown[])      { return this.forward("upsert", a); }
  delete(...a: unknown[])      { return this.forward("delete", a); }
  eq(...a: unknown[])          { return this.forward("eq", a); }
  neq(...a: unknown[])         { return this.forward("neq", a); }
  gt(...a: unknown[])          { return this.forward("gt", a); }
  gte(...a: unknown[])         { return this.forward("gte", a); }
  lt(...a: unknown[])          { return this.forward("lt", a); }
  lte(...a: unknown[])         { return this.forward("lte", a); }
  in(...a: unknown[])          { return this.forward("in", a); }
  is(...a: unknown[])          { return this.forward("is", a); }
  or(...a: unknown[])          { return this.forward("or", a); }
  not(...a: unknown[])         { return this.forward("not", a); }
  ilike(...a: unknown[])       { return this.forward("ilike", a); }
  like(...a: unknown[])        { return this.forward("like", a); }
  order(...a: unknown[])       { return this.forward("order", a); }
  limit(...a: unknown[])       { return this.forward("limit", a); }
  range(...a: unknown[])       { return this.forward("range", a); }
  single(...a: unknown[])      { return this.forward("single", a); }
  maybeSingle(...a: unknown[]) { return this.forward("maybeSingle", a); }

  then(onfulfilled?: any, onrejected?: any): Promise<any> {
    return this.execute().then(onfulfilled, onrejected);
  }
  catch(onrejected?: any): Promise<any> { return this.execute().catch(onrejected); }

  private cacheKey(): string { return this.keyParts.join("|"); }

  private async execute(): Promise<any> {
    // ── بلا اتصال ──
    if (!isOnline()) {
      if (this.op === "select") {
        const cached = cacheGet(this.cacheKey());
        if (cached !== undefined) return { data: cached, error: null, offline: true };
        return { data: null, error: { message: OFFLINE_MSG }, offline: true };
      }
      if (this.op === "insert" && this.insertValues) {
        pushOutbox({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          table: this.table,
          values: this.insertValues,
          at: Date.now(),
        });
        return { data: this.insertValues, error: null, queued: true };
      }
      // تعديل/حذف دون اتصال = مرفوض بوضوح (منع التعارضات)
      return { data: null, error: { message: OFFLINE_MSG }, offline: true };
    }

    // ── متصل: تمرير مباشر + تخزين القراءات ──
    try {
      const result = await this.real;
      if (this.op === "select" && result && !result.error) {
        cacheSet(this.cacheKey(), result.data);
      }
      return result;
    } catch (e) {
      // انقطاع أثناء الطلب
      if (isNetworkError(e)) {
        if (this.op === "select") {
          const cached = cacheGet(this.cacheKey());
          if (cached !== undefined) return { data: cached, error: null, offline: true };
        }
        if (this.op === "insert" && this.insertValues) {
          pushOutbox({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            table: this.table,
            values: this.insertValues,
            at: Date.now(),
          });
          return { data: this.insertValues, error: null, queued: true };
        }
        return { data: null, error: { message: OFFLINE_MSG }, offline: true };
      }
      throw e;
    }
  }
}

function safeStr(v: unknown): string {
  try { return JSON.stringify(v) ?? ""; } catch { return ""; }
}

/**
 * يغلّف عميل Supabase الحقيقي. عند تعطيل الميزة يُعاد العميل الأصلي
 * نفسه بلا أي وسيط — سلوك التطبيق يبقى مطابقاً تماماً لما قبل الميزة.
 */
export function wrapWithOffline<T extends object>(realClient: T): T {
  if (typeof window === "undefined") return realClient;
  if (!isOfflineFeatureEnabled()) return realClient;

  // مزامنة تلقائية عند عودة الاتصال
  window.addEventListener("online", () => { void syncOutbox(realClient); });
  // محاولة مزامنة أولى إن وُجد طابور قديم
  if (isOnline() && pendingCount() > 0) void syncOutbox(realClient);

  return new Proxy(realClient, {
    get(target, prop, receiver) {
      if (prop === "from") {
        return (table: string) => new OfflineQuery(target, table);
      }
      // auth / storage / channel / rpc — تمر للأصلي دون أي تدخّل
      return Reflect.get(target, prop, receiver);
    },
  }) as T;
}
