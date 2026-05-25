import { useEffect, useState } from 'react';
import { supabase, callFunction } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import PaymentMethodForm from '../components/PaymentMethodForm.jsx';

export default function StudentBilling() {
  const { user, profile, refreshProfile } = useAuth();
  const [payments, setPayments] = useState([]);
  const [clientSecret, setClientSecret] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => { reload(); /* eslint-disable-line */ }, [user]);

  async function reload() {
    if (!user) return;
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('student_id', user.id)
      .order('year', { ascending: false })
      .order('month', { ascending: false });
    setPayments(data ?? []);
  }

  async function startSubscription() {
    setBusy(true); setErr(null);
    try {
      const res = await callFunction('create-subscription');
      setClientSecret(res.clientSecret);
      await refreshProfile();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const isSubscribed = !!profile?.stripe_subscription_id;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-slate-500">Manage your monthly tuition.</p>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-2">Monthly auto-pay</h2>
        {isSubscribed && !clientSecret ? (
          <div className="text-sm text-emerald-700">
            ✓ Auto-pay is set up. Your card will be charged each month.
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-600 mb-3">
              Save Apple Pay, Google Pay, or a card once. Your monthly tuition will be charged
              automatically — no need to enter it every month.
            </p>
            {!clientSecret && (
              <button className="btn-primary" onClick={startSubscription} disabled={busy}>
                {busy ? 'Setting up…' : 'Set up monthly auto-pay'}
              </button>
            )}
            {err && <div className="text-sm text-red-600 mt-2">{err}</div>}
            {clientSecret && (
              <div className="mt-4">
                <PaymentMethodForm clientSecret={clientSecret} onSuccess={() => { setClientSecret(null); reload(); refreshProfile(); }} />
              </div>
            )}
          </>
        )}
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">Payment history</h2>
        {payments.length === 0 ? (
          <div className="text-sm text-slate-500">No payments yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500">
                <th className="py-2">Period</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="py-2">
                    {new Date(p.year, p.month - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                  </td>
                  <td>${(p.amount_cents / 100).toFixed(2)}</td>
                  <td>
                    <span className={`pill ${
                      p.status === 'paid' ? 'bg-emerald-100 text-emerald-700'
                      : p.status === 'failed' ? 'bg-red-100 text-red-700'
                      : 'bg-slate-100 text-slate-700'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="text-xs text-slate-500">
                    {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
