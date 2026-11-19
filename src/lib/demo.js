/**
 * Demo backend: an in-browser stand-in for the Supabase client.
 *
 * It implements the subset of the supabase-js query builder this app uses
 * (select / insert / update / upsert / delete, eq / in / is / gte / lt filters,
 * order, single, maybeSingle, count, and foreign-key joins) on top of seeded
 * sample data kept in localStorage. This lets the live demo run without a
 * database, while the real app talks to Supabase with the same code.
 */
import { SURAHS } from './quran.js';

const STORAGE_KEY = 'dugsi-demo-db-v1';
const SESSION_KEY = 'dugsi-demo-session-v1';

export const DEMO_ACCOUNTS = {
  teacher: { email: 'teacher@dugsi.demo', password: 'demo1234' },
  student: { email: 'student@dugsi.demo', password: 'demo1234' },
};

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

function uuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const iso = (d) => d.toISOString();
const ymd = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 86400000);

const TEACHER_ID = '00000000-0000-4000-8000-000000000001';
const STUDENT_NAMES = [
  'Amina Yusuf', 'Bilal Hassan', 'Hodan Ali', 'Ibrahim Warsame', 'Khadija Omar',
  'Mohamed Abdi', 'Safiya Noor', 'Yusuf Farah', 'Zainab Ahmed', 'Hamza Mohamud',
];

/** Students memorize from the end of the Quran (Juz Amma) backwards, as is traditional. */
function memorizedAyahs(count) {
  const out = [];
  for (let s = 114; s >= 1 && out.length < count; s--) {
    const total = SURAHS[s - 1]?.ayahs ?? 0;
    for (let a = 1; a <= total && out.length < count; a++) out.push([s, a]);
  }
  return out;
}

function seed() {
  const rand = seededRandom(2026);
  const now = new Date();
  const created = iso(daysAgo(200));
  const db = {
    profiles: [], mistakes: [], payments: [], attendance: [], goals: [], classes: [],
    class_enrollments: [], announcements: [], assignments: [], assignment_completions: [],
  };

  db.profiles.push({
    id: TEACHER_ID, role: 'teacher', full_name: 'Abdirahman Ali', teacher_id: null,
    monthly_rate_cents: 6000, current_surah: null, current_ayah: null,
    stripe_customer_id: null, stripe_subscription_id: null, created_at: created,
  });

  const memorizedCounts = [612, 140, 905, 64, 1310, 287, 433, 96, 750, 201];
  const students = STUDENT_NAMES.map((full_name, i) => {
    const id = `00000000-0000-4000-8000-0000000001${String(i).padStart(2, '0')}`;
    const mem = memorizedAyahs(memorizedCounts[i]);
    const [cs, ca] = mem[mem.length - 1] ?? [114, 1];
    const p = {
      id, role: 'student', full_name, teacher_id: TEACHER_ID, monthly_rate_cents: 6000,
      current_surah: cs, current_ayah: ca,
      stripe_customer_id: i % 3 === 0 ? `cus_demo${i}` : null,
      stripe_subscription_id: i % 3 === 0 ? `sub_demo${i}` : null,
      created_at: created,
    };
    db.profiles.push(p);
    return { ...p, mem };
  });

  // Recitation mistakes the teacher marked, some already resolved
  for (const s of students) {
    const n = 2 + Math.floor(rand() * 6);
    for (let k = 0; k < n; k++) {
      const [surah, ayah] = s.mem[Math.floor(rand() * s.mem.length)];
      db.mistakes.push({
        id: uuid(), student_id: s.id, teacher_id: TEACHER_ID, surah_number: surah, ayah_number: ayah,
        note: ['Tajweed: madd too short', 'Skipped a word', 'Mixed up with a similar ayah', 'Ghunnah missing', null][k % 5],
        resolved_at: rand() < 0.35 ? iso(daysAgo(Math.floor(rand() * 20))) : null,
        created_at: iso(daysAgo(5 + Math.floor(rand() * 40))),
      });
    }
  }

  // Attendance for class days (Mon-Thu, Sat) over the last ~6 weeks
  for (let d = 42; d >= 1; d--) {
    const date = daysAgo(d);
    const dow = date.getDay();
    if (dow === 5 || dow === 0) continue;
    for (const s of students) {
      const r = rand();
      db.attendance.push({
        id: uuid(), student_id: s.id, teacher_id: TEACHER_ID, date: ymd(date),
        status: r < 0.84 ? 'present' : r < 0.92 ? 'late' : r < 0.97 ? 'absent' : 'excused',
        note: null, created_at: iso(date),
      });
    }
  }

  // Tuition: paid for previous months this year, current month mixed
  const year = now.getFullYear();
  const thisMonth = now.getMonth() + 1;
  for (const s of students) {
    for (let m = 1; m <= thisMonth; m++) {
      const current = m === thisMonth;
      const paid = current ? rand() < 0.6 : rand() < 0.96;
      db.payments.push({
        id: uuid(), student_id: s.id, teacher_id: TEACHER_ID, month: m, year,
        amount_cents: 6000, status: paid ? 'paid' : 'unpaid',
        paid_at: paid ? iso(new Date(year, m - 1, 2 + Math.floor(rand() * 8))) : null,
        stripe_invoice_id: paid && s.stripe_subscription_id ? `in_demo_${m}_${s.id.slice(-2)}` : null,
        created_at: iso(new Date(year, m - 1, 1)),
      });
    }
  }

  // Monthly goals
  const monthStart = ymd(new Date(year, now.getMonth(), 1));
  const monthEnd = ymd(new Date(year, now.getMonth() + 1, 0));
  for (const s of students.slice(0, 7)) {
    const target = 40 + Math.floor(rand() * 60);
    db.goals.push({
      id: uuid(), student_id: s.id, teacher_id: TEACHER_ID, period_type: 'monthly',
      period_start: monthStart, period_end: monthEnd,
      target_text: `Memorize ${target} new ayahs and review Juz 30`,
      target_ayahs: target, completed_ayahs: Math.floor(target * rand()),
      target_surahs: [], target_juz: [30], created_at: iso(daysAgo(10)),
    });
  }

  // Classes with announcements and assignments
  const classes = [
    { name: 'Hifz — Morning Halaqa', description: 'New memorization and daily review', color: '#0e6b5e' },
    { name: 'Tajweed Foundations', description: 'Rules of recitation: noon sakinah, madd, qalqalah', color: '#7c3aed' },
  ].map((c, i) => ({ id: uuid(), teacher_id: TEACHER_ID, ...c, created_at: iso(daysAgo(120 - i)) }));
  db.classes.push(...classes);
  students.forEach((s, i) => {
    db.class_enrollments.push({ id: uuid(), class_id: classes[0].id, student_id: s.id, created_at: created });
    if (i % 2 === 0) db.class_enrollments.push({ id: uuid(), class_id: classes[1].id, student_id: s.id, created_at: created });
  });
  db.announcements.push(
    { id: uuid(), class_id: classes[0].id, teacher_id: TEACHER_ID, body: 'Reminder: monthly review test this Saturday. Revise everything memorized this month.', created_at: iso(daysAgo(2)) },
    { id: uuid(), class_id: classes[0].id, teacher_id: TEACHER_ID, body: 'Great work this week, everyone. Keep up the daily revision at home.', created_at: iso(daysAgo(9)) },
    { id: uuid(), class_id: classes[1].id, teacher_id: TEACHER_ID, body: 'Next lesson: the rules of idghaam. Bring your mushaf.', created_at: iso(daysAgo(4)) },
  );
  const assignments = [
    { class_id: classes[0].id, title: 'Revise Surah Al-Mulk', description: 'Recite to a parent twice before Thursday.', due_date: ymd(daysAgo(-3)) },
    { class_id: classes[0].id, title: 'Memorize Surah Al-Qalam 1–16', description: null, due_date: ymd(daysAgo(-10)) },
    { class_id: classes[1].id, title: 'Worksheet: noon sakinah rules', description: 'Identify 10 examples of ikhfa in Juz 30.', due_date: ymd(daysAgo(1)) },
  ].map((a, i) => ({ id: uuid(), teacher_id: TEACHER_ID, ...a, created_at: iso(daysAgo(6 - i)) }));
  db.assignments.push(...assignments);
  students.slice(0, 6).forEach((s) =>
    db.assignment_completions.push({ id: uuid(), assignment_id: assignments[0].id, student_id: s.id, completed_at: iso(daysAgo(1)), note: null }),
  );

  // Demo auth users
  db.users = [
    { id: TEACHER_ID, email: DEMO_ACCOUNTS.teacher.email, password: DEMO_ACCOUNTS.teacher.password },
    { id: students[0].id, email: DEMO_ACCOUNTS.student.email, password: DEMO_ACCOUNTS.student.password },
  ];
  return db;
}

/** Progress rows are derived (never edited in the UI), so they're generated rather than stored. */
function progressRows(db) {
  const rows = [];
  const counts = [612, 140, 905, 64, 1310, 287, 433, 96, 750, 201];
  db.profiles
    .filter((p) => p.role === 'student')
    .forEach((p, i) => {
      memorizedAyahs(counts[i] ?? 0).forEach(([surah_number, ayah_number], k) =>
        rows.push({ id: `${p.id}-${k}`, student_id: p.id, teacher_id: p.teacher_id, surah_number, ayah_number, memorized_at: null }),
      );
    });
  return rows;
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

let db = null;
let progressCache = null;

function load() {
  if (db) return db;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) db = JSON.parse(raw);
  } catch { /* storage unavailable: fall back to memory */ }
  if (!db) db = seed();
  return db;
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch { /* ignore */ }
}
function table(name) {
  const d = load();
  if (name === 'progress') return (progressCache ??= progressRows(d));
  return (d[name] ??= []);
}

export function resetDemo() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  db = null;
  progressCache = null;
}

// ---------------------------------------------------------------------------
// Query builder
// ---------------------------------------------------------------------------

const UNIQUE_KEYS = {
  attendance: ['student_id', 'date'],
  goals: ['student_id', 'period_type', 'period_start'],
};

/** Parses "a, b, alias:table!fk_name(c, d)" into plain columns and joins. */
function parseColumns(cols, source) {
  if (!cols || cols.trim() === '*') return { all: true, columns: [], joins: [] };
  const parts = [];
  let depth = 0, cur = '';
  for (const ch of cols) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  const columns = [], joins = [];
  let all = false;
  for (const p of parts) {
    const m = p.match(/^(\w+):(\w+)(?:!(\w+))?\(([^)]*)\)$/);
    if (m) {
      const [, alias, target, fk, inner] = m;
      // "class_enrollments_student_id_fkey" → "student_id"
      const fkColumn = fk ? fk.replace(`${source}_`, '').replace(/_fkey$/, '') : `${target.replace(/s$/, '')}_id`;
      joins.push({ alias, target, fkColumn, inner: parseColumns(inner, target) });
    } else if (p === '*') all = true;
    else columns.push(p);
  }
  return { all, columns, joins };
}

function project(row, spec) {
  const out = spec.all ? { ...row } : Object.fromEntries(spec.columns.map((c) => [c, row[c] ?? null]));
  for (const j of spec.joins) {
    const related = table(j.target).find((r) => r.id === row[j.fkColumn]);
    out[j.alias] = related ? project(related, j.inner) : null;
  }
  return out;
}

const delay = () => new Promise((r) => setTimeout(r, 60 + Math.random() * 90));

class Query {
  constructor(name) {
    this.name = name;
    this.filters = [];
    this.orders = [];
    this.action = 'select';
    this.selectSpec = null;
    this.mode = 'many';
    this.countOnly = false;
    this.limitN = null;
  }

  select(cols = '*', opts = {}) {
    this.selectSpec = parseColumns(cols, this.name);
    if (opts.head) this.countOnly = true;
    this.wantCount = opts.count === 'exact';
    return this;
  }
  insert(rows) { this.action = 'insert'; this.payload = rows; return this; }
  update(patch) { this.action = 'update'; this.payload = patch; return this; }
  upsert(rows, opts = {}) { this.action = 'upsert'; this.payload = rows; this.onConflict = opts.onConflict; return this; }
  delete() { this.action = 'delete'; return this; }

  eq(c, v) { this.filters.push((r) => r[c] === v); return this; }
  neq(c, v) { this.filters.push((r) => r[c] !== v); return this; }
  in(c, vs) { this.filters.push((r) => vs.includes(r[c])); return this; }
  is(c, v) { this.filters.push((r) => (r[c] ?? null) === v); return this; }
  gt(c, v) { this.filters.push((r) => r[c] > v); return this; }
  gte(c, v) { this.filters.push((r) => r[c] >= v); return this; }
  lt(c, v) { this.filters.push((r) => r[c] < v); return this; }
  lte(c, v) { this.filters.push((r) => r[c] <= v); return this; }
  order(c, opts = {}) { this.orders.push([c, opts.ascending !== false]); return this; }
  limit(n) { this.limitN = n; return this; }
  single() { this.mode = 'single'; return this; }
  maybeSingle() { this.mode = 'maybe'; return this; }

  then(resolve, reject) {
    return delay().then(() => this.execute()).then(resolve, reject);
  }

  matches(row) { return this.filters.every((f) => f(row)); }

  execute() {
    const rows = table(this.name);
    let result;

    if (this.action === 'select') {
      result = rows.filter((r) => this.matches(r));
    } else if (this.action === 'insert' || this.action === 'upsert') {
      const list = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((r) => ({ ...r }));
      const keys = this.onConflict ? this.onConflict.split(',').map((s) => s.trim()) : UNIQUE_KEYS[this.name];
      result = [];
      for (const r of list) {
        const existing = keys && rows.find((x) => keys.every((k) => x[k] === r[k]));
        if (existing && this.action === 'upsert') {
          Object.assign(existing, r);
          result.push(existing);
        } else if (existing) {
          return { data: null, error: { message: `duplicate key value violates unique constraint on ${this.name}` }, count: null };
        } else {
          const row = { id: uuid(), created_at: new Date().toISOString(), ...r };
          rows.push(row);
          result.push(row);
        }
      }
      save();
    } else if (this.action === 'update') {
      result = rows.filter((r) => this.matches(r));
      result.forEach((r) => Object.assign(r, this.payload));
      save();
    } else if (this.action === 'delete') {
      result = rows.filter((r) => this.matches(r));
      const keep = rows.filter((r) => !this.matches(r));
      rows.length = 0;
      rows.push(...keep);
      save();
    }

    for (const [c, asc] of [...this.orders].reverse()) {
      result = [...result].sort((a, b) => (a[c] < b[c] ? -1 : a[c] > b[c] ? 1 : 0) * (asc ? 1 : -1));
    }
    if (this.limitN != null) result = result.slice(0, this.limitN);
    const count = result.length;
    if (this.countOnly) return { data: null, error: null, count };

    const spec = this.selectSpec ?? { all: true, columns: [], joins: [] };
    let data = result.map((r) => project(r, spec));
    if (this.action !== 'select' && !this.selectSpec) data = null;

    if (this.mode === 'single') {
      if (!data || data.length !== 1) return { data: null, error: { message: `Expected 1 row, found ${data?.length ?? 0}` }, count };
      return { data: data[0], error: null, count };
    }
    if (this.mode === 'maybe') return { data: data?.[0] ?? null, error: null, count };
    return { data, error: null, count: this.wantCount ? count : null };
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const listeners = new Set();

function getStoredSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null'); } catch { return memorySession; }
}
let memorySession = null;
function setSession(s) {
  memorySession = s;
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }
  listeners.forEach((cb) => cb(s ? 'SIGNED_IN' : 'SIGNED_OUT', s));
}
const makeSession = (user) => ({ access_token: 'demo', user: { id: user.id, email: user.email } });

function createUser({ email, password, full_name, teacher_id }) {
  const d = load();
  d.users ??= [];
  if (d.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('User already registered');
  }
  const id = uuid();
  d.users.push({ id, email, password });
  const teacher = d.profiles.find((p) => p.role === 'teacher');
  d.profiles.push({
    id, role: 'student', full_name: full_name || email.split('@')[0],
    teacher_id: teacher_id ?? teacher?.id ?? null, monthly_rate_cents: teacher?.monthly_rate_cents ?? 6000,
    current_surah: 114, current_ayah: 1, stripe_customer_id: null, stripe_subscription_id: null,
    created_at: new Date().toISOString(),
  });
  save();
  return { id, email };
}

export const demoClient = {
  from: (name) => new Query(name),
  auth: {
    async getSession() {
      return { data: { session: getStoredSession() }, error: null };
    },
    onAuthStateChange(cb) {
      listeners.add(cb);
      return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
    },
    async signInWithPassword({ email, password }) {
      await delay();
      const user = (load().users ?? []).find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!user || user.password !== password) return { data: null, error: { message: 'Invalid login credentials' } };
      const s = makeSession(user);
      setSession(s);
      return { data: { session: s, user: s.user }, error: null };
    },
    async signUp({ email, password, options }) {
      await delay();
      try {
        const user = createUser({ email, password, full_name: options?.data?.full_name });
        const s = makeSession(user);
        setSession(s);
        return { data: { user: s.user, session: s }, error: null };
      } catch (e) {
        return { data: null, error: { message: e.message } };
      }
    },
    async signOut() {
      setSession(null);
      return { error: null };
    },
    async updateUser({ password }) {
      const s = getStoredSession();
      const user = (load().users ?? []).find((u) => u.id === s?.user?.id);
      if (user && password) { user.password = password; save(); }
      return { data: { user: s?.user ?? null }, error: null };
    },
    async resetPasswordForEmail() {
      return { data: {}, error: null };
    },
  },
};

export async function demoSignUpStudent({ email, password, full_name, teacher_id }) {
  await delay();
  return createUser({ email, password, full_name, teacher_id });
}

/** Stand-ins for the Supabase Edge Functions. */
export async function demoCallFunction(name, body) {
  await delay();
  const d = load();
  const s = getStoredSession();
  if (name === 'create-subscription') {
    // Real app: creates a Stripe subscription and returns a client secret for the Payment Element.
    const me = d.profiles.find((p) => p.id === s?.user?.id);
    if (me) {
      me.stripe_customer_id = `cus_demo_${me.id.slice(-4)}`;
      me.stripe_subscription_id = `sub_demo_${me.id.slice(-4)}`;
      save();
    }
    return { clientSecret: null, demo: true };
  }
  if (name === 'reset-student-password') {
    const user = (d.users ?? []).find((u) => u.id === body?.student_id);
    if (user && body?.new_password) { user.password = body.new_password; save(); }
    return { ok: true };
  }
  if (name === 'create-student') return demoSignUpStudent(body ?? {});
  return { ok: true };
}
