import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Payments() {
  const { user } = useAuth();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { reload(); /* eslint-disable-line */ }, [month, year, user]);

  async function reload() {
    if (!user) return;
    setLoading(true);
    const [{ data: students }, { data: pays }] = await Promise.all([
      supabase.from('profiles')
        .select('id, full_name, monthly_rate_cents')
        .eq('teacher_id', user.id).order('full_name'),
      supabase.from('payments').select('*')
        .eq('teacher_id', user.id).eq('month', month).eq('year', year),
    ]);
    const byStudent = new Map((pays ?? []).map((p) => [p.student_id, p]));
    setRows(
      (students ?? []).map((s) => ({ student: s, payment: byStudent.get(s.id) ?? null }))
    );
    setLoading(false);
  }

  async function savePayment(row, amountCents, status) {
    const payload = {
      student_id: row.student.id,
      teacher_id: user.id,
      month, year,
      amount_cents: amountCents,
      status,
      paid_at: status === 'paid' ? new Date().toISOString() : null,
    };
    const { data, error } = row.payment
      ? await supabase.from('payments').update(payload).eq('id', row.payment.id).select().single()
      : await supabase.from('payments').insert(payload).select().single();
    if (error) return alert(error.message);
    setRows((prev) => prev.map((r) => r.student.id === row.student.id ? { ...r, payment: data } : r));
  }

  const totals = useMemo(() => {
    let paid = 0, unpaid = 0, paidAmount = 0, totalAmount = 0;
    for (const r of rows) {
      const rate = r.student.monthly_rate_cents ?? 0;
      totalAmount += rate;
      if (r.payment?.status === 'paid') { paid++; paidAmount += r.payment.amount_cents ?? rate; }
      else unpaid++;
    }
    return { paid, unpaid, paidAmount, totalAmount };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">Payments</h1>
        <div className="flex gap-2">
          <select className="input w-auto" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleString('en-US', { month: 'long' })}</option>
            ))}
          </select>
          <input className="input w-24" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <SummaryCard label="Collected" value={`$${(totals.paidAmount / 100).toFixed(2)}`} sub={`${totals.paid} students paid`} />
        <SummaryCard label="Outstanding" value={`$${((totals.totalAmount - totals.paidAmount) / 100).toFixed(2)}`} sub={`${totals.unpaid} unpaid`} />
        <SummaryCard label="Expected" value={`$${(totals.totalAmount / 100).toFixed(2)}`} sub={`${rows.length} students`} />
      </div>

      <div className="card">
        {loading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-slate-500">No students yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500">
                <th className="py-2">Student</th>
                <th>Default rate</th>
                <th>Amount paid</th>
                <th>Status</th>
                <th>Paid on</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <PaymentRow key={r.student.id} row={r} onSave={savePayment} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function PaymentRow({ row, onSave }) {
  const defaultDollars = row.student.monthly_rate_cents ? (row.student.monthly_rate_cents / 100).toString() : '';
  const paidDollars = row.payment?.amount_cents != null ? (row.payment.amount_cents / 100).toString() : '';
  const [amount, setAmount] = useState(paidDollars || defaultDollars);
  const [busy, setBusy] = useState(false);

  // keep input in sync if a different month is loaded
  useEffect(() => {
    setAmount(paidDollars || defaultDollars);
  }, [paidDollars, defaultDollars]);

  async function markPaid() {
    const cents = Math.round(Number(amount || 0) * 100);
    if (cents <= 0) return;
    setBusy(true);
    await onSave(row, cents, 'paid');
    setBusy(false);
  }

  async function markUnpaid() {
    setBusy(true);
    await onSave(row, row.payment?.amount_cents ?? 0, 'unpaid');
    setBusy(false);
  }

  const paid = row.payment?.status === 'paid';

  return (
    <tr className="border-t border-slate-100">
      <td className="py-3">
        <Link to={`/students/${row.student.id}`} className="hover:underline font-medium">
          {row.student.full_name}
        </Link>
      </td>
      <td className="text-slate-600">
        ${((row.student.monthly_rate_cents ?? 0) / 100).toFixed(2)}
      </td>
      <td>
        <div className="relative inline-block">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
          <input
            type="number" min="0" step="0.01" inputMode="decimal"
            className="input pl-5 w-24 py-1 text-sm"
            value={amount}
            placeholder={defaultDollars || '0'}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      </td>
      <td>
        <span className={`pill ${
          paid ? 'bg-emerald-100 text-emerald-700'
          : row.payment?.status === 'failed' ? 'bg-red-100 text-red-700'
          : 'bg-slate-100 text-slate-700'
        }`}>
          {row.payment?.status ?? 'unpaid'}
        </span>
      </td>
      <td className="text-xs text-slate-500">
        {row.payment?.paid_at ? new Date(row.payment.paid_at).toLocaleDateString() : '—'}
        {row.payment?.stripe_invoice_id && <span className="ml-1 pill bg-indigo-50 text-indigo-700">Stripe</span>}
      </td>
      <td className="text-right">
        {paid ? (
          <button onClick={markUnpaid} disabled={busy} className="btn-ghost text-xs">
            Mark unpaid
          </button>
        ) : (
          <button
            onClick={markPaid}
            disabled={busy || !amount || Number(amount) <= 0}
            className="btn-primary text-xs"
          >
            {busy ? 'Saving…' : 'Mark paid'}
          </button>
        )}
      </td>
    </tr>
  );
}

function SummaryCard({ label, value, sub }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{sub}</div>
    </div>
  );
}
