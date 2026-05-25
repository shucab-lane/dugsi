import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, signUpStudentSideClient } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import ResetPasswordModal from '../components/ResetPasswordModal.jsx';

export default function TeacherStudents() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);

  useEffect(() => { reload(); /* eslint-disable-line */ }, [user]);

  async function reload() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, monthly_rate_cents')
      .eq('teacher_id', user.id)
      .order('full_name');
    if (error) setError(error.message);
    else setStudents(data ?? []);
    setLoading(false);
  }

  async function addStudent(e) {
    e.preventDefault();
    setBusy(true); setError(null); setCreated(null);
    try {
      // Sign the student up using a non-persistent client so we don't log the
      // teacher out. We pass teacher_id in user metadata; the on_auth_user_created
      // trigger (after migration-3) reads it and creates the profile row with
      // role='student' and the correct teacher_id atomically.
      await signUpStudentSideClient({
        email, password, full_name: name, teacher_id: user.id,
      });

      // Wait a beat for Supabase to commit + give the new row time to be visible
      // under RLS, then refresh the student list. If the new student doesn't
      // show up, the trigger probably hasn't been updated yet — see the help text.
      await new Promise((r) => setTimeout(r, 400));

      setCreated({ email, full_name: name });
      setName(''); setEmail(''); setPassword('');
      await reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Students</h1>

      <div className="card">
        <h2 className="font-semibold mb-2">Add a student</h2>
        <p className="text-xs text-slate-500 mb-3">
          Creates a login for the student. Share the email + password with them or their parent —
          they can change the password after signing in.
        </p>
        <form onSubmit={addStudent} className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Full name</label>
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Temporary password</label>
            <input className="input" type="text" required minLength={6} value={password}
              onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="sm:col-span-3 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <button className="btn-primary" disabled={busy}>
                {busy ? 'Adding…' : 'Add student'}
              </button>
              {created && (
                <span className="text-sm text-emerald-700">
                  ✓ {created.full_name} ({created.email}) added.
                </span>
              )}
            </div>
            {error && <div className="text-sm text-red-600 whitespace-pre-wrap">{error}</div>}
          </div>
        </form>
        <details className="mt-4 text-xs text-slate-500">
          <summary className="cursor-pointer">First time? Two one-off steps needed</summary>
          <ol className="list-decimal ml-5 mt-2 space-y-1">
            <li>
              In the Supabase SQL editor, run{' '}
              <code className="bg-slate-100 px-1 rounded">supabase/migration-3-trigger-handles-claim.sql</code>.
              This makes the database trigger create the student row already linked to you.
            </li>
            <li>
              In Supabase → Authentication → Sign in / Providers → Email, uncheck{' '}
              <strong>Confirm email</strong>. Otherwise new students can't sign in until they
              click a confirmation link in their inbox.
            </li>
          </ol>
        </details>
      </div>

      {resetTarget && (
        <ResetPasswordModal
          student={resetTarget}
          onClose={() => setResetTarget(null)}
        />
      )}

      <div className="card">
        <h2 className="font-semibold mb-3">Your students ({students.length})</h2>
        {loading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : students.length === 0 ? (
          <div className="text-sm text-slate-500">No students yet.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {students.map((s) => (
              <li key={s.id} className="py-3 flex items-center gap-3">
                <Link to={`/students/${s.id}`} className="font-medium hover:underline flex-1">
                  {s.full_name}
                </Link>
                <span className="text-xs text-slate-500 hidden sm:inline">
                  ${((s.monthly_rate_cents ?? 0) / 100).toFixed(2)}/mo
                </span>
                <button
                  className="btn-ghost text-xs"
                  onClick={() => setResetTarget(s)}
                >
                  Reset password
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
