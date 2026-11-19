import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children, requireTeacher = false }) {
  const { session, profile, loading, isTeacher } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-500">
        Loading…
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  if (requireTeacher && !isTeacher) return <Navigate to="/" replace />;
  if (!profile) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-500">
        Setting up your profile…
      </div>
    );
  }
  return children;
}
