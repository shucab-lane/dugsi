import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Layout({ children }) {
  const { profile, isTeacher, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  const linkCls = ({ isActive }) =>
    `px-3 py-2 rounded-lg text-sm font-medium ${
      isActive ? 'bg-mosque text-white' : 'text-slate-700 hover:bg-slate-100'
    }`;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-mosque text-white grid place-items-center font-bold">د</div>
            <div className="font-semibold text-lg">Dugsi</div>
          </Link>
          <nav className="hidden sm:flex items-center gap-1 ml-4">
            {isTeacher ? (
              <>
                <NavLink to="/" end className={linkCls}>Dashboard</NavLink>
                <NavLink to="/students" className={linkCls}>Students</NavLink>
                <NavLink to="/classes" className={linkCls}>Classes</NavLink>
                <NavLink to="/halaqa" className={linkCls}>Halaqa</NavLink>
                <NavLink to="/attendance" className={linkCls}>Attendance</NavLink>
                <NavLink to="/payments" className={linkCls}>Payments</NavLink>
              </>
            ) : (
              <>
                <NavLink to="/" end className={linkCls}>My Progress</NavLink>
                <NavLink to="/classes" className={linkCls}>Classes</NavLink>
                <NavLink to="/billing" className={linkCls}>Billing</NavLink>
              </>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {profile && (
              <span className="text-sm text-slate-600 hidden sm:inline">
                {profile.full_name}
                <span className="ml-2 pill bg-slate-100 text-slate-700 capitalize">{profile.role}</span>
              </span>
            )}
            <button onClick={handleSignOut} className="btn-ghost text-sm">Sign out</button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-slate-500">
          Dugsi · Quran progress tracker
        </div>
      </footer>
    </div>
  );
}
