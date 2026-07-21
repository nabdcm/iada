// ============================================================
// src/lib/demo.ts — وضع التجربة (Demo Mode)
// عميل Supabase وهمي يعمل بالكامل في ذاكرة المتصفح
// لا يلمس قاعدة البيانات إطلاقاً ولا يؤثر على جلسات العملاء
// ============================================================

export const DEMO_COOKIE = "nabd-demo";
export const DEMO_UID = "demo-user-0000-0000-000000000000";

export function isDemoActive(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some(c => c.trim().startsWith(`${DEMO_COOKIE}=1`));
}

export function startDemo(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${DEMO_COOKIE}=1; path=/; max-age=${60 * 60 * 6}; SameSite=Lax`;
}

export function exitDemo(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  window.location.href = "/";
}

// ────────────────────────────────────────────────────────────
// بيانات وهمية
// ────────────────────────────────────────────────────────────
type Row = Record<string, unknown>;

const today = new Date();
const d = (offset: number) => {
  const t = new Date(today);
  t.setDate(t.getDate() + offset);
  return t.toISOString().slice(0, 10);
};
const iso = (offset: number) => new Date(today.getTime() + offset * 86400000).toISOString();

const NAMES = [
  "أحمد الخطيب","سارة العلي","محمد نور","ليلى حسن","عمر شاهين","هدى المصري",
  "خالد يوسف","ريم عبدالله","سامر حداد","نور الدين قاسم","مريم سليمان","يزن الأحمد",
];

function seedPatients(): Row[] {
  return NAMES.map((name, i) => ({
    id: i + 1,
    user_id: DEMO_UID,
    name,
    phone: `09${(31000000 + i * 137913).toString().slice(0, 8)}`,
    gender: i % 2 === 0 ? "male" : "female",
    date_of_birth: `${1960 + i * 3}-0${(i % 9) + 1}-1${i % 9}`,
    has_diabetes: i % 4 === 0,
    has_hypertension: i % 5 === 0,
    notes: i === 0 ? "مريض تجريبي — حساسية بنسلين" : "",
    is_hidden: false,
    doctor_id: null,
    created_at: iso(-60 + i * 4),
  }));
}

function seedAppointments(): Row[] {
  const types = ["كشف", "مراجعة", "استشارة", "متابعة"];
  const rows: Row[] = [];
  let id = 1;
  // مواعيد اليوم
  ["09:00", "09:30", "10:15", "11:00", "12:00", "16:30"].forEach((time, i) => {
    rows.push({
      id: id++, user_id: DEMO_UID, patient_id: (i % NAMES.length) + 1,
      date: d(0), time, duration: 30, type: types[i % 4],
      notes: "", status: i < 2 ? "completed" : "scheduled",
      doctor_id: null, created_at: iso(-2),
    });
  });
  // أيام سابقة ولاحقة
  for (let day = -14; day <= 7; day++) {
    if (day === 0) continue;
    const count = ((day + 20) % 3) + 1;
    for (let k = 0; k < count; k++) {
      rows.push({
        id: id++, user_id: DEMO_UID, patient_id: ((id + k) % NAMES.length) + 1,
        date: d(day), time: `${9 + k * 2}:${k % 2 === 0 ? "00" : "30"}`,
        duration: 30, type: types[(day + k + 20) % 4], notes: "",
        status: day < 0 ? (k === 2 ? "no-show" : "completed") : "scheduled",
        doctor_id: null, created_at: iso(day - 1),
      });
    }
  }
  return rows;
}

function seedPayments(): Row[] {
  const rows: Row[] = [];
  let id = 1;
  for (let day = -30; day <= 0; day++) {
    const count = ((day + 40) % 3);
    for (let k = 0; k < count; k++) {
      const amount = [15000, 25000, 20000, 35000, 10000][(day + k + 40) % 5];
      rows.push({
        id: id++, user_id: DEMO_UID, patient_id: ((id + k) % NAMES.length) + 1,
        amount, description: "أجور معاينة", method: k % 2 === 0 ? "cash" : "transfer",
        status: "paid", date: d(day), notes: "", created_at: iso(day),
      });
    }
  }
  return rows;
}

function seedPrescriptions(): Row[] {
  const meds = [
    "Amoxicillin 500mg — كبسولة كل 8 ساعات لمدة 7 أيام",
    "Paracetamol 500mg — حبة عند اللزوم",
    "Omeprazole 20mg — حبة صباحاً قبل الطعام",
  ];
  return [0, 1, 2, 3, 4].map(i => ({
    id: i + 1, user_id: DEMO_UID, patient_id: i + 1,
    patient_name: NAMES[i],
    date: d(-i * 3), diagnosis: ["التهاب بلعوم", "ارتفاع ضغط", "حرقة معدة", "متلازمة قولون", "صداع نصفي"][i],
    medications: meds.slice(0, (i % 3) + 1).join("\n"),
    notes: "", doctor_id: null, created_at: iso(-i * 3),
  }));
}

function buildSeed(): Record<string, Row[]> {
  return {
    patients: seedPatients(),
    appointments: seedAppointments(),
    payments: seedPayments(),
    prescriptions: seedPrescriptions(),
    clinics: [{
      id: 1, user_id: DEMO_UID, name: "عيادة نبض التجريبية", owner_name: "د. تجربة نبض",
      plan: "enterprise", status: "active", max_doctors: 1,
      expiry_date: d(365), created_at: iso(-90),
    }],
    settings: [{
      id: 1, user_id: DEMO_UID, clinic_name: "عيادة نبض التجريبية",
      doctor_name: "د. تجربة نبض", currency: "ل.س",
    }],
    clinic_messages: [
      { id: 1, from_id: "nabd-admin", to_id: DEMO_UID, from_role: "admin", body: "أهلاً بك في تجربة نبض! 👋 هذه رسالة تجريبية من فريق الدعم.", is_read: true, created_at: iso(-1) },
    ],
    clinic_expenses: [
      { id: 1, user_id: DEMO_UID, title: "إيجار العيادة", amount: 500000, date: d(-10), category: "rent", notes: "", created_at: iso(-10) },
      { id: 2, user_id: DEMO_UID, title: "مستلزمات طبية", amount: 120000, date: d(-5), category: "supplies", notes: "", created_at: iso(-5) },
    ],
    clinic_withdrawals: [
      { id: 1, user_id: DEMO_UID, amount: 300000, date: d(-7), notes: "سحب شخصي", created_at: iso(-7) },
    ],
    doctors: [],
    doctor_schedules: [],
    daily_logs: [],
    tracking_links: [],
    xrays: [],
    clinic_profiles: [{ id: 1, user_id: DEMO_UID, slug: "demo", booking_enabled: false }],
    master_patients: [],
    patient_profiles: [],
    lab_orders: [],
    profiles: [],
  };
}

// ────────────────────────────────────────────────────────────
// مخزن الذاكرة (يعيش طوال الجلسة فقط)
// ────────────────────────────────────────────────────────────
let store: Record<string, Row[]> | null = null;
let nextId = 100000;

function getStore(): Record<string, Row[]> {
  if (!store) store = buildSeed();
  return store;
}

function getTable(name: string): Row[] {
  const s = getStore();
  if (!s[name]) s[name] = [];
  return s[name];
}

// ────────────────────────────────────────────────────────────
// منشئ الاستعلامات الوهمي (thenable)
// ────────────────────────────────────────────────────────────
type Filter = (row: Row) => boolean;
type Order = { col: string; asc: boolean };
type Result = { data: unknown; error: null | { message: string } ; count?: number | null };

class DemoQuery implements PromiseLike<Result> {
  private table: string;
  private op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private limitN: number | null = null;
  private singleMode: "single" | "maybe" | null = null;
  private payload: Row | Row[] | null = null;
  private wantReturn = false;

  constructor(table: string) { this.table = table; }

  select(_cols?: string, _opts?: unknown) {
    if (this.op === "select") { /* keep */ } else { this.wantReturn = true; }
    return this;
  }
  insert(values: Row | Row[]) { this.op = "insert"; this.payload = values; return this; }
  update(values: Row) { this.op = "update"; this.payload = values; return this; }
  upsert(values: Row | Row[]) { this.op = "upsert"; this.payload = values; return this; }
  delete() { this.op = "delete"; return this; }

  eq(col: string, val: unknown)  { this.filters.push(r => String(r[col]) === String(val)); return this; }
  neq(col: string, val: unknown) { this.filters.push(r => String(r[col]) !== String(val)); return this; }
  gt(col: string, val: unknown)  { this.filters.push(r => String(r[col]) >  String(val)); return this; }
  gte(col: string, val: unknown) { this.filters.push(r => String(r[col]) >= String(val)); return this; }
  lt(col: string, val: unknown)  { this.filters.push(r => String(r[col]) <  String(val)); return this; }
  lte(col: string, val: unknown) { this.filters.push(r => String(r[col]) <= String(val)); return this; }
  in(col: string, vals: unknown[]) { const set = vals.map(String); this.filters.push(r => set.includes(String(r[col]))); return this; }
  is(col: string, val: unknown) { this.filters.push(r => (val === null ? r[col] == null : r[col] === val)); return this; }
  ilike(col: string, pattern: string) {
    const p = pattern.replace(/%/g, "").toLowerCase();
    this.filters.push(r => String(r[col] ?? "").toLowerCase().includes(p));
    return this;
  }
  like(col: string, pattern: string) { return this.ilike(col, pattern); }
  not(_col: string, _op: string, _val: unknown) { return this; }
  or(expr: string) {
    // يدعم صيغة: "col.eq.val,col2.eq.val2"
    const parts = expr.split(",").map(p => p.split("."));
    this.filters.push(r => parts.some(([col, op, ...rest]) => {
      const val = rest.join(".");
      if (op === "eq") return String(r[col]) === val;
      if (op === "ilike") return String(r[col] ?? "").toLowerCase().includes(val.replace(/%/g, "").toLowerCase());
      return false;
    }));
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orders.push({ col, asc: opts?.ascending !== false });
    return this;
  }
  limit(n: number) { this.limitN = n; return this; }
  range(from: number, to: number) { this.limitN = to - from + 1; return this; }
  single() { this.singleMode = "single"; return this; }
  maybeSingle() { this.singleMode = "maybe"; return this; }

  private run(): Result {
    const rows = getTable(this.table);

    if (this.op === "insert" || this.op === "upsert") {
      const list = Array.isArray(this.payload) ? this.payload : [this.payload as Row];
      const inserted = list.map(v => {
        const row: Row = { id: nextId++, created_at: new Date().toISOString(), user_id: DEMO_UID, ...v };
        rows.push(row);
        return row;
      });
      const data = this.singleMode ? inserted[0] : inserted;
      return { data, error: null };
    }

    let matched = rows.filter(r => this.filters.every(f => f(r)));

    if (this.op === "update") {
      matched.forEach(r => Object.assign(r, this.payload));
      return { data: this.singleMode ? (matched[0] ?? null) : matched, error: null };
    }

    if (this.op === "delete") {
      const s = getStore();
      s[this.table] = rows.filter(r => !this.filters.every(f => f(r)));
      return { data: matched, error: null };
    }

    // select
    for (const o of [...this.orders].reverse()) {
      matched = [...matched].sort((a, b) => {
        const av = String(a[o.col] ?? ""), bv = String(b[o.col] ?? "");
        return (av < bv ? -1 : av > bv ? 1 : 0) * (o.asc ? 1 : -1);
      });
    }
    if (this.limitN != null) matched = matched.slice(0, this.limitN);

    if (this.singleMode) {
      const row = matched[0] ?? null;
      if (this.singleMode === "single" && !row) {
        return { data: null, error: { message: "No rows found" } };
      }
      return { data: row, error: null, count: matched.length };
    }
    return { data: matched, error: null, count: matched.length };
  }

  then<T1 = Result, T2 = never>(
    onfulfilled?: ((value: Result) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
  ): PromiseLike<T1 | T2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }
}

// ────────────────────────────────────────────────────────────
// عميل Supabase الوهمي
// ────────────────────────────────────────────────────────────
function demoSession() {
  return {
    access_token: "demo-token",
    refresh_token: "demo-refresh",
    expires_at: Math.floor(Date.now() / 1000) + 3600 * 6,
    user: {
      id: DEMO_UID,
      email: "demo@nabd.clinic",
      user_metadata: { account_type: "clinic", full_name: "د. تجربة نبض" },
    },
  };
}

export function createDemoClient(): unknown {
  return {
    from: (table: string) => new DemoQuery(table),
    rpc: async () => ({ data: null, error: null }),
    auth: {
      getUser: async () => ({ data: { user: demoSession().user }, error: null }),
      getSession: async () => ({ data: { session: demoSession() }, error: null }),
      onAuthStateChange: (_cb: unknown) => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signOut: async () => { exitDemo(); return { error: null }; },
      signInWithPassword: async () => ({ data: { session: demoSession(), user: demoSession().user }, error: null }),
    },
    storage: {
      from: (_bucket: string) => ({
        upload: async () => ({ data: { path: "demo/file" }, error: null }),
        remove: async () => ({ data: null, error: null }),
        createSignedUrl: async () => ({ data: { signedUrl: "" }, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
      }),
    },
    channel: (_name: string) => {
      const ch = {
        on: () => ch,
        subscribe: () => ch,
        unsubscribe: () => {},
      };
      return ch;
    },
    removeChannel: (_ch: unknown) => {},
  };
}
