import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { juzOf, surahByNumber, TOTAL_AYAHS } from '../lib/quran.js';

export default function Cohort() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [progressByStudent, setProgressByStudent] = useState({});
  const [paymentByStudent, setPaymentByStudent] = useState({});
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const month = today.getMonth() + 1, year = today.getFullYear();

  useEffect(() => { reload(); /* eslint-disable-line */ }, [user]);

  async function reload() {
    if (!user) return;
    setLoading(true);
    const { data: ss } = await supabase
      .from('profiles')
      .select('id, full_name, current_surah, current_ayah, monthly_rate_cents')
      .eq('teacher_id', user.id)
      .order('full_name');

    const ids = (ss ?? []).map((s) => s.id);
    let prog = {}, pays = {};
    if (ids.length) {
      const [{ data: pr }, { data: pm }] = await Promise.all([
        supabase.from('progress').select('student_id').in('student_id', ids),
        supabase.from('payments').select('student_id, status')
          .in('student_id', ids).eq('month', month).eq('year', year),
      ]);
      for (const r of pr ?? []) prog[r.student_id] = (prog[r.student_id] ?? 0) + 1;
      for (const r of pm ?? []) pays[r.student_id] = r.status;
    }
    setStudents(ss ?? []);
    setProgressByStudent(prog);
    setPaymentByStudent(pays);
    setLoading(false);
  }

  // Group students by current juz (or "unset" if no current position).
  const groups = useMemo(() => {
    const map = new Map();
    for (const s of students) {
      const j = s.current_surah ? juzOf(s.current_surah, s.current_ayah ?? 1) : 0;
      if (!map.has(j)) map.set(j, []);
      map.get(j).push(s);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [students]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Halaqa overview</h1>
        <p className="text-slate-500 text-sm">
          See where every student is in the Quran. Students in the same juz are easy to pair up.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : students.length === 0 ? (
        <div className="card text-sm text-slate-500">No students yet.</div>
      ) : (
        groups.map(([juz, list]) => (
          <div key={juz} className="card">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-semibold">
                {juz === 0 ? 'No current position set' : `Juz ${juz}`}
                <span className="ml-2 pill bg-slate-100 text-slate-700">{list.length} student{list.length === 1 ? '' : 's'}</span>
              </h2>
              {juz > 0 && (
                <span className="text-xs text-slate-500">
                  {list.length > 1 ? 'These students can practice together.' : ''}
                </span>
              )}
            </div>
            <ul className="divide-y divide-slate-100">
              {list.map((s) => {
                const meta = s.current_surah ? surahByNumber(s.current_surah) : null;
                const memorized = progressByStudent[s.id] ?? 0;
                const pct = ((memorized / TOTAL_AYAHS) * 100).toFixed(1);
                const pay = paymentByStudent[s.id];
                return (
                  <li key={s.id} className="py-3 flex flex-wrap items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 grid place-items-center text-xs font-medium text-slate-600">
                      {s.full_name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-[180px]">
                      <Link to={`/students/${s.id}`} className="font-medium hover:underline">
                        {s.full_name}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {meta ? (
                          <>On {meta.name} {s.current_ayah ? `(ayah ${s.current_ayah})` : ''}</>
                        ) : (
                          <span className="italic">No current position set</span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 w-28">
                      {memorized.toLocaleString()} / {TOTAL_AYAHS.toLocaleString()} ({pct}%)
                    </div>
                    <span className={`pill ${
                      pay === 'paid' ? 'bg-emerald-100 text-emerald-700'
                      : pay === 'failed' ? 'bg-red-100 text-red-700'
                      : 'bg-slate-100 text-slate-600'
                    }`}>
                      {pay ?? 'unpaid'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
