import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

/**
 * Where students land after clicking the password-reset link from their email.
 * Supabase puts a recovery token in the URL hash and creates a session.
 * We just let them set a new password.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(false);
  const [hasSession, setHasSession] = useState(null);

  useEffect(() => {
    // Supabase handles the hash-based recovery token automatically; check we have a session.
    (async () => {
      const { data } = await supabase.auth.getSession();
      setHasSession(!!data.session);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setHasSession(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    if (password.length < 6) { setErr('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setErr("Passwords don't match."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setErr(error.message);
    else setDone(true);
  }

  return (
    <div className="min-h-screen grid place-items-center bg-cream px-4">
      <div className="w-full max-w-sm card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-lg bg-mosque text-white grid place-items-center font-bold">د</div>
          <div className="text-xl font-semibold">Dugsi</div>
        </div>

        {done ? (
          <>
            <h1 className="text-lg font-semibold mb-1">Password updated</h1>
            <p className="text-sm text-slate-600 mb-4">You can use it next time you sign in.</p>
            <button className="btn-primary w-full" onClick={() => navigate('/')}>
              Continue
            </button>
          </>
        ) : hasSession === false ? (
          <>
            <h1 className="text-lg font-semibold mb-1">Link expired or invalid</h1>
            <p className="text-sm text-slate-600">
              The reset link is no longer valid. Ask your teacher to send you a new one,
              or to set a new password for you.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold mb-1">Set a new password</h1>
            <p className="text-sm text-slate-500 mb-4">Pick something you'll remember.</p>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="label">New password</label>
                <input type="password" required minLength={6} className="input"
                  value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div>
                <label className="label">Confirm</label>
                <input type="password" required minLength={6} className="input"
                  value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              {err && <div className="text-sm text-red-600">{err}</div>}
              <button className="btn-primary w-full" disabled={busy}>
                {busy ? 'Saving…' : 'Save new password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
