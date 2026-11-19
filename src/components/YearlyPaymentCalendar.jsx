import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * 12-month grid for a student. Click a past/current month to open a small
 * editor where you can enter the exact amount paid and mark it paid/unpaid.
 * Different students (or different months) can have different amounts.
 */
export default function YearlyPaymentCalendar({ studentId, monthlyRateCents }) {
  const { user } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(null);
  const [editing, setEditing] = useState(null); // { month, row|null }

  useEffect(() => { reload(); /* eslint-disable-line */ }, [studentId, year]);

  async function reload() {
    setErr(null);
    const { data, error } = await supabase
      .from('payments').select('*')
      .eq('student_id', studentId).eq('year', year);
    if (error) setErr(error.message);
    else setRows(data ?? []);
  }

  const byMonth = useMemo(() => {
    const m = new Map();
    for (const r of rows) m.set(r.month, r);
    return m;
  }, [rows]);

  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();

  function cellState(monthIdx) {
    const month = monthIdx + 1;
    const row = byMonth.get(month);
    const inFuture = year > curYear || (year === curYear && month > curMonth);
    if (inFuture) return { state: 'future', row };
    if (row?.status === 'paid')   return { state: 'paid', row };
    if (row?.status === 'failed') return { state: 'failed', row };
    return { state: 'missed', row };
  }

  function openEditor(monthIdx) {
    const month = monthIdx + 1;
    const inFuture = year > curYear || (year === curYear && month > curMonth);
    if (inFuture) return;
    setEditing({ month, row: byMonth.get(month) ?? null });
  }

  async function savePayment({ month, status, amountCents }) {
    const existing = byMonth.get(month);
    const payload = {
      student_id: studentId,
      teacher_id: user.id,
      month, year,
      amount_cents: amountCents,
      status,
      paid_at: status === 'paid' ? new Date().toISOString() : null,
    };
    const { data, error } = existing
      ? await supabase.from('payments').update(payload).eq('id', existing.id).select().single()
      : await supabase.from('payments').insert(payload).select().single();
    if (error) { setErr(error.message); return false; }
    setRows((prev) => {
      const filtered = prev.filter((r) => r.id !== data.id);
      return [...filtered, data];
    });
    return true;
  }

  const collected = useMemo(
    () => rows.filter((r) => r.status === 'paid').reduce((s, r) => s + (r.amount_cents ?? 0), 0),
    [rows]
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Payment calendar — {year}</h3>
        <div className="flex items-center gap-2">
          <button className="btn-ghost text-sm px-2 py-1" onClick={() => setYear(year - 1)}>‹</button>
          <span className="text-sm w-12 text-center">{year}</span>
          <button className="btn-ghost text-sm px-2 py-1" onClick={() => setYear(year + 1)}>›</button>
        </div>
      </div>
      {err && <div className="text-sm text-red-600 mb-2">{err}</div>}
      <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
        {MONTHS.map((label, i) => {
          const { state, row } = cellState(i);
          const cls =
            state === 'paid'   ? 'bg-emerald-500 text-white hover:bg-emerald-600'
          : state === 'failed' ? 'bg-red-500 text-white hover:bg-red-600'
          : state === 'missed' ? 'bg-red-100 text-red-800 hover:bg-red-200 ring-1 ring-red-300'
          : 'bg-slate-100 text-slate-400';
          const subline =
            state === 'paid' && row?.amount_cents != null
              ? `$${(row.amount_cents / 100).toFixed(0)}`
              : '';
          return (
            <button
              key={i}
              disabled={state === 'future'}
              onClick={() => openEditor(i)}
              className={`h-14 rounded-lg text-xs font-medium transition flex flex-col items-center justify-center ${cls}`}
            >
              <span>{label}</span>
              {subline && <span className="text-[10px] opacity-90 mt-0.5">{subline}</span>}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
        <Legend cls="bg-emerald-500" label="Paid" />
        <Legend cls="bg-red-100 ring-1 ring-red-300" label="Missed" />
        <Legend cls="bg-red-500" label="Failed" />
        <Legend cls="bg-slate-100" label="Upcoming" />
        <span className="ml-auto">Collected this year: ${(collected / 100).toFixed(2)}</span>
      </div>

      {editing && (
        <PaymentEditor
          month={editing.month}
          year={year}
          row={editing.row}
          defaultCents={monthlyRateCents}
          onClose={() => setEditing(null)}
          onSave={async (status, amountCents) => {
            const ok = await savePayment({ month: editing.month, status, amountCents });
            if (ok) setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function Legend({ cls, label }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block w-3 h-3 rounded ${cls}`} />
      {label}
    </span>
  );
}

function PaymentEditor({ month, year, row, defaultCents, onClose, onSave }) {
  // Pre-fill: existing payment amount, else student's default rate, else blank.
  const initialDollars = row?.amount_cents != null
    ? (row.amount_cents / 100).toString()
    : defaultCents
      ? (defaultCents / 100).toString()
      : '';
  const [amount, setAmount] = useState(initialDollars);
  const [saving, setSaving] = useState(false);

  const monthLabel = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });

  async function markPaid() {
    const cents = Math.round(Number(amount || 0) * 100);
    if (cents <= 0) return;
    setSaving(true);
    await onSave('paid', cents);
    setSaving(false);
  }

  async function markUnpaid() {
    setSaving(true);
    await onSave('unpaid', row?.amount_cents ?? 0);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-semibold text-lg">{monthLabel}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>

        <label className="label">Amount paid (USD)</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
          <input
            className="input pl-7"
            type="number" min="0" step="0.01" inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">
          You can type any amount — different students can pay different prices.
        </p>

        {row?.status === 'paid' && row?.paid_at && (
          <div className="text-xs text-slate-500 mt-3">
            Previously marked paid {new Date(row.paid_at).toLocaleDateString()}
            {row?.stripe_invoice_id && ' · via Stripe'}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2 justify-end">
          {row?.status === 'paid' && (
            <button className="btn-ghost" onClick={markUnpaid} disabled={saving}>
              Mark unpaid
            </button>
          )}
          <button
            className="btn-primary"
            onClick={markPaid}
            disabled={saving || !amount || Number(amount) <= 0}
          >
            {saving ? 'Saving…' : row?.status === 'paid' ? 'Update amount' : 'Mark paid'}
          </button>
        </div>
      </div>
    </div>
  );
}
