import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { TOTAL_AYAHS } from '../lib/quran.js';
import ProgressBar from '../components/ProgressBar.jsx';

export default function TeacherDashboard() {
  const { user, profile } = useAuth();
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({ openMistakes: 0, paidThisMonth: 0, totalPayments: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const now = new Date();
      const m = now.getMonth() + 1, y = now.getFullYear();

      const [{ data: ss }, { count: openMistakes }, { data: pays }] = await Promise.all([
        supabase.from('profiles').select('id, full_name').eq('teacher_id', user.id).order('full_name'),
        supabase.from('mistakes').select('*', { count: 'exact', head: true })
          .eq('teacher_id', user.id).is('resolved_at', null),
        supabase.from('payments').select('status')
          .eq('teacher_id', user.id).eq('month', m).eq('year', y),
      ]);

      const studentIds = (ss ?? []).map((s) => s.id);
      let progressByStudent = {};
      if (studentIds.length) {
        const { data: pr } = await supabase
          .from('progress')
          .select('student_id')
          .in('student_id', studentIds);
        for (const r of pr ?? []) {
          progressByStudent[r.student_id] = (progressByStudent[r.student_id] ?? 0) + 1;
        }
      }

      setStudents(
        (ss ?? []).map((s) => ({ ...s, memorized: progressByStudent[s.id] ?? 0 }))
      );
      setStats({
        openMistakes: openMistakes ?? 0,
        paidThisMonth: (pays ?? []).filter((p) => p.status === 'paid').length,
        totalPayments: (pays ?? []).length,
      });
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Assalamu alaikum, ustadh {profile?.full_name?.split(' ')[0]}</h1>
          <p className="text-slate-500">Quick snapshot of your halaqa.</p>
        </div>
        <Link to="/students" className="btn-primary">+ Add student</Link>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-slate-500">Students</div>
          <div className="text-3xl font-semibold mt-1">{students.length}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-slate-500">Open mistakes</div>
          <div className="text-3xl font-semibold mt-1 text-red-600">{stats.openMistakes}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-slate-500">Paid this month</div>
          <div className="text-3xl font-semibold mt-1">
            {stats.paidThisMonth}
            <span className="text-base font-normal text-slate-500"> / {students.length}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">Students</h2>
        {loading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : students.length === 0 ? (
          <div className="text-sm text-slate-500">
            No students yet. <Link to="/students" className="text-mosque hover:underline">Add one</Link>.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {students.map((s) => (
              <li key={s.id} className="py-3 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-slate-100 grid place-items-center text-sm font-medium text-slate-600">
                  {s.full_name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <Link to={`/students/${s.id}`} className="font-medium hover:underline">
                    {s.full_name}
                  </Link>
                  <div className="mt-1 max-w-xs">
                    <ProgressBar
                      label="Quran"
                      value={s.memorized}
                      max={TOTAL_AYAHS}
                    />
                  </div>
                </div>
                <Link to={`/students/${s.id}`} className="btn-ghost text-sm">Open</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
