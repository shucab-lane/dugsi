import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { signIn, session } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (session) navigate('/', { replace: true });

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) setError(error.message);
    else navigate('/');
  }

  return (
    <div className="min-h-screen grid place-items-center bg-cream px-4">
      <div className="w-full max-w-sm card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-lg bg-mosque text-white grid place-items-center font-bold">د</div>
          <div className="text-xl font-semibold">Dugsi</div>
        </div>
        <h1 className="text-lg font-semibold mb-1">Sign in</h1>
        <p className="text-sm text-slate-500 mb-4">Welcome back.</p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">Email</label>
            <input
              type="email" autoComplete="email" required
              className="input" value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password" autoComplete="current-password" required
              className="input" value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="text-sm text-slate-500 mt-4">
          No account?{' '}
          <Link to="/signup" className="text-mosque font-medium hover:underline">
            Create one
          </Link>
        </p>
        <p className="text-sm text-slate-500 mt-2">
          <Link to="/forgot-password" className="text-mosque font-medium hover:underline">
            Forgot password?
          </Link>
        </p>
      </div>
    </div>
  );
}
