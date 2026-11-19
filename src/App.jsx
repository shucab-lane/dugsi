import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { IS_CONFIGURED } from './lib/supabase.js';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';

import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import StudentSurah from './pages/StudentSurah.jsx';
import StudentBilling from './pages/StudentBilling.jsx';
import TeacherDashboard from './pages/TeacherDashboard.jsx';
import TeacherStudents from './pages/TeacherStudents.jsx';
import TeacherStudent from './pages/TeacherStudent.jsx';
import TeacherSurah from './pages/TeacherSurah.jsx';
import Payments from './pages/Payments.jsx';
import Attendance from './pages/Attendance.jsx';
import Cohort from './pages/Cohort.jsx';
import Classes from './pages/Classes.jsx';
import ClassDetail from './pages/ClassDetail.jsx';

function RoleHome() {
  const { isTeacher } = useAuth();
  return isTeacher ? <TeacherDashboard /> : <StudentDashboard />;
}

function SetupNeeded() {
  return (
    <div className="min-h-screen grid place-items-center bg-cream px-4">
      <div className="card max-w-lg">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-lg bg-mosque text-white grid place-items-center font-bold">د</div>
          <div className="text-xl font-semibold">Dugsi — setup needed</div>
        </div>
        <p className="text-sm text-slate-600 mb-3">
          Your Supabase environment variables aren't set. Create a file called
          <code className="bg-slate-100 px-1 mx-1 rounded">.env</code>
          in the project root (next to <code className="bg-slate-100 px-1 rounded">package.json</code>) with:
        </p>
        <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-3 overflow-auto">
{`VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...`}
        </pre>
        <p className="text-sm text-slate-600 mt-3">
          Then stop the dev server (<kbd>Ctrl+C</kbd>) and run <code className="bg-slate-100 px-1 rounded">npm run dev</code> again.
          Vite only reads <code className="bg-slate-100 px-1 rounded">.env</code> at startup — not
          <code className="bg-slate-100 px-1 mx-1 rounded">.env.example</code>.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  if (!IS_CONFIGURED) return <SetupNeeded />;
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<RoleHome />} />

                {/* student */}
                <Route path="/surah/:n" element={<StudentSurah />} />
                <Route path="/billing" element={<StudentBilling />} />

                {/* teacher */}
                <Route
                  path="/students"
                  element={
                    <ProtectedRoute requireTeacher>
                      <TeacherStudents />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/students/:id"
                  element={
                    <ProtectedRoute requireTeacher>
                      <TeacherStudent />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/students/:id/surah/:n"
                  element={
                    <ProtectedRoute requireTeacher>
                      <TeacherSurah />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/payments"
                  element={
                    <ProtectedRoute requireTeacher>
                      <Payments />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/attendance"
                  element={
                    <ProtectedRoute requireTeacher>
                      <Attendance />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/halaqa"
                  element={
                    <ProtectedRoute requireTeacher>
                      <Cohort />
                    </ProtectedRoute>
                  }
                />

                {/* classes — both teacher and student can access */}
                <Route path="/classes" element={<Classes />} />
                <Route path="/classes/:id" element={<ClassDetail />} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
