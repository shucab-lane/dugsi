import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { TOTAL_AYAHS, surahByNumber, juzOf } from '../lib/quran.js';
import ProgressBar from '../components/ProgressBar.jsx';
import GoalCard from '../components/GoalCard.jsx';
import CurrentPositionEditor from '../components/CurrentPositionEditor.jsx';

export default function StudentDashboard() {
  const { user, profile } = useAuth();
  const [memorized, setMemorized] = useState(0);
  const [openMistakes, setOpenMistakes] = useState([]);
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const [{ count }, { data: ms }, { data: att }] = await Promise.all([
        supabase.from('progress').select('*', { count: 'exact', head: true }).eq('student_id', user.id),
        supabase.from('mistakes').select('*').eq('student_id', user.id).is('resolved_at', null)
          .order('surah_number').order('ayah_number'),
        supabase.from('attendance').select('date, status')
          .eq('student_id', user.id).gte('date', since.toISOString().slice(0, 10))
          .order('date', { ascending: false }),
      ]);
      setMemorized(count ?? 0);
      setOpenMistakes(ms ?? []);
      setRecentAttendance(att ?? []);
      setLoading(false);
    })();
  }, [user]);

  const grouped = groupBySurah(openMistakes);
  const currentJuz = profile?.current_surah ? juzOf(profile.current_surah, profile.current_ayah ?? 1) : null;
  const absentLast30 = recentAttendance.filter((a) => a.status === 'absent').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Assalamu alaikum, {profile?.full_name?.split(' ')[0]}</h1>
        <p className="text-slate-500">
          {currentJuz ? <>You're on Juz {currentJuz}. </> : null}
          Here's where you are.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card">
          <ProgressBar label="Whole Quran" value={memorized} max={TOTAL_AYAHS} sub="ayahs memorized" />
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-slate-500">Open mistakes</div>
          <div className="text-3xl font-semibold mt-1 text-red-600">{openMistakes.length}</div>
          <div className="text-xs text-slate-500 mt-1">to fix in your surahs</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-slate-500">Last 30 days</div>
          <div className="text-3xl font-semibold mt-1">
            {recentAttendance.length}
            <span className="text-base font-normal text-slate-500"> classes</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">{absentLast30} absences</div>
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="font-semibold">Your goals</h2>
          <span className="text-xs text-slate-500">Visible to your teacher</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <GoalCard period="weekly"     studentId={user.id} teacherId={profile?.teacher_id} />
          <GoalCard period="monthly"    studentId={user.id} teacherId={profile?.teacher_id} />
          <GoalCard period="six_months" studentId={user.id} teacherId={profile?.teacher_id} />
          <GoalCard period="annual"     studentId={user.id} teacherId={profile?.teacher_id} />
        </div>
      </div>

      <CurrentPositionEditor studentId={user.id} initial={profile} />

      <div className="card">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="font-semibold">Things to fix</h2>
          <span className="text-xs text-slate-500">{openMistakes.length} open</span>
        </div>
        {loading ? (
          <div className="text-slate-500 text-sm">Loading…</div>
        ) : openMistakes.length === 0 ? (
          <div className="text-sm text-slate-500">Nothing flagged. Mashallah.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {Object.entries(grouped).map(([surahN, items]) => {
              const meta = surahByNumber(surahN);
              return (
                <li key={surahN} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">
                      {meta?.n}. {meta?.name}{' '}
                      <span className="arabic text-slate-500">{meta?.arabic}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Ayahs: {items.map((i) => i.ayah_number).join(', ')}
                    </div>
                  </div>
                  <Link to={`/surah/${surahN}`} className="btn-ghost text-sm">View</Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function groupBySurah(arr) {
  const out = {};
  for (const m of arr) {
    if (!out[m.surah_number]) out[m.surah_number] = [];
    out[m.surah_number].push(m);
  }
  return out;
}
