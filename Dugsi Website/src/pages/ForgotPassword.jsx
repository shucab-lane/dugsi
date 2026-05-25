import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from '../lib/supabase.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await sendPasswordResetEmail(email.trim());
      setSent(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-cream px-4">
      <div className="w-full max-w-sm card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-lg bg-mosque text-white grid place-items-center font-bold">د</div>
          <div className="text-xl font-semibold">Dugsi</div>
        </div>

        {sent ? (
          <>
            <h1 className="text-lg font-semibold mb-1">Check your email</h1>
            <p className="text-sm text-slate-600">
              If an account exists for <strong>{email}</strong>, we sent a link to reset your password.
              Click the link in the email to pick a new password.
            </p>
            <p className="text-xs text-slate-500 mt-3">
              Didn't get it? Check your spam folder. Or ask your teacher to reset your password
              in person.
            </p>
            <Link to="/login" className="btn-ghost w-full mt-4">Back to sign in</Link>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold mb-1">Forgot password?</h1>
            <p className="text-sm text-slate-500 mb-4">
              Type your email and we'll send you a link to reset it.
            </p>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {err && <div className="text-sm text-red-600">{err}</div>}
              <button className="btn-primary w-full" disabled={busy || !email}>
                {busy ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
            <p className="text-sm text-slate-500 mt-4">
              Remembered it?{' '}
              <Link to="/login" className="text-mosque font-medium hover:underline">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
