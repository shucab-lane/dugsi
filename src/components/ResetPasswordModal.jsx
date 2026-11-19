import { useState } from 'react';
import { callFunction, sendPasswordResetEmail } from '../lib/supabase.js';

/**
 * Two paths:
 *  1. "Set new password" — calls the reset-student-password Edge Function (admin).
 *     No email needed, no rate limit. Requires the function to be deployed.
 *  2. "Email a reset link" — uses Supabase Auth's built-in resetPasswordForEmail.
 *     Works without deploying anything, but is subject to Supabase's email rate limit
 *     unless you've hooked up custom SMTP.
 */
export default function ResetPasswordModal({ student, onClose }) {
  const [mode, setMode] = useState('direct'); // 'direct' | 'email'
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  if (!student) return null;

  async function submitDirect() {
    if (!password || password.length < 6) {
      setErr('Password must be at least 6 characters.');
      return;
    }
    setBusy(true); setErr(null); setMsg(null);
    try {
      await callFunction('reset-student-password', {
        student_id: student.id, new_password: password,
      });
      setMsg(`Done. Tell ${student.full_name} their new password: ${password}`);
      setPassword('');
    } catch (e) {
      setErr(
        e.message?.includes('Failed to fetch') || e.message?.includes('404')
          ? 'The reset-student-password Edge Function is not deployed. Use the "Email reset link" tab instead, or deploy the function with: npx supabase functions deploy reset-student-password'
          : e.message
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitEmail() {
    setBusy(true); setErr(null); setMsg(null);
    try {
      // We don't have the student's email on profile rows — pull from auth via the
      // student's profile id is impossible from the client. The teacher remembers it.
      // To keep things flexible we just ask the teacher to confirm the email.
      const email = prompt(`Send a reset link to which email for ${student.full_name}?`);
      if (!email) { setBusy(false); return; }
      await sendPasswordResetEmail(email.trim());
      setMsg(`Reset link sent to ${email}. They'll click it to set a new password.`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-semibold text-lg">Reset password — {student.full_name}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>

        <div className="flex gap-1 border-b border-slate-200 mb-4">
          <button
            onClick={() => { setMode('direct'); setMsg(null); setErr(null); }}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              mode === 'direct' ? 'border-mosque text-mosque' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Set new password
          </button>
          <button
            onClick={() => { setMode('email'); setMsg(null); setErr(null); }}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              mode === 'email' ? 'border-mosque text-mosque' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Email reset link
          </button>
        </div>

        {mode === 'direct' ? (
          <>
            <p className="text-sm text-slate-600 mb-3">
              Type a new password for the student. No email involved — just tell them in person.
            </p>
            <label className="label">New password</label>
            <input
              className="input"
              type="text"
              minLength={6}
              value={password}
              autoFocus
              placeholder="At least 6 characters"
              onChange={(e) => setPassword(e.target.value)}
            />
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600 mb-3">
              We'll send a reset link to the student's email. They click it to pick their own
              password.
            </p>
            <p className="text-xs text-slate-500">
              Heads up: Supabase's built-in email service is rate-limited to a few per hour on
              the free tier. Use this sparingly, or configure custom SMTP in
              Supabase → Authentication → Email.
            </p>
          </>
        )}

        {err && <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 whitespace-pre-wrap">{err}</div>}
        {msg && <div className="mt-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">{msg}</div>}

        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose} disabled={busy}>Close</button>
          {mode === 'direct' ? (
            <button className="btn-primary" onClick={submitDirect} disabled={busy || !password}>
              {busy ? 'Saving…' : 'Set new password'}
            </button>
          ) : (
            <button className="btn-primary" onClick={submitEmail} disabled={busy}>
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
