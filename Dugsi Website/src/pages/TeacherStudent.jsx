import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { SURAHS, TOTAL_AYAHS, surahByNumber, juzOf } from '../lib/quran.js';
import ProgressBar from '../components/ProgressBar.jsx';
import GoalCard from '../components/GoalCard.jsx';
import YearlyPaymentCalendar from '../components/YearlyPaymentCalendar.jsx';
import CurrentPositionEditor from '../components/CurrentPositionEditor.jsx';

export default function TeacherStudent() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [progressCount, setProgressCount] = useState(0);
  const [mistakes, setMistakes] = useState([]);
  const [pickSurah, setPickSurah] = useState('1');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const now = useMemo(() => new Date(), []);

  useEffect(() => { reload(); /* eslint-disable-line */ }, [id]);

  async function reload() {
    setLoading(true);
    const [{ data: s, error: sErr }, { count }, { data: ms }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('progress').select('*', { count: 'exact', head: true }).eq('student_id', id),
      supabase.from('mistakes').select('*').eq('student_id', id).is('resolved_at', null)
        .order('surah_number').order('ayah_number'),
    ]);
    if (sErr) setErr(sErr.message);
    setStudent(s);
    setProgressCount(count ?? 0);
    setMistakes(ms ?? []);
    setLoading(false);
  }

  async function resolveMistake(m) {
    const { data, error } = await supabase
      .from('mistakes').update({ resolved_at: new Date().toISOString() })
      .eq('id', m.id).select().single();
    if (error) setErr(error.message);
    else setMistakes((prev) => prev.filter((x) => x.id !== data.id));
  }

  async function updateRate(cents) {
    const { data, error } = await supabase
      .from('profiles').update({ monthly_rate_cents: cents }).eq('id', id).select().single();
    if (error) setErr(error.message);
    else setStudent(data);
  }

  if (loading || !student) {
    return <div className="text-slate-500">Loading…</div>;
  }

  const currentJuz = student.current_surah ? juzOf(student.current_surah, student.current_ayah ?? 1) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <Link to="/students" className="text-sm text-mosque hover:underline">← All students</Link>
          <h1 className="text-2xl font-semibold mt-1">{student.full_name}</h1>
          {currentJuz && (
            <div className="text-xs text-slate-500 mt-1">
              Currently on Juz {currentJuz}
              {student.current_surah && ` · ${surahByNumber(student.current_surah)?.name} ${student.current_ayah ?? ''}`}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select className="input w-auto" value={pickSurah} onChange={(e) => setPickSurah(e.target.value)}>
            {SURAHS.map((s) => (
              <option key={s.n} value={s.n}>{s.n}. {s.name}</option>
            ))}
          </select>
          <button
            className="btn-primary"
            onClick={() => navigate(`/students/${id}/surah/${pickSurah}`)}
          >
            Open Quran
          </button>
        </div>
      </div>

      {err && <div className="card bg-red-50 border-red-200 text-red-700">{err}</div>}

      <div className="card">
        <ProgressBar label="Whole Quran" value={progressCount} max={TOTAL_AYAHS} sub="ayahs memorized" />
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="font-semibold">Goals</h2>
          <span className="text-xs text-slate-500">Set by the student. View only.</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <GoalCard period="weekly"     studentId={id} teacherId={user.id} readOnly />
          <GoalCard period="monthly"    studentId={id} teacherId={user.id} readOnly />
          <GoalCard period="six_months" studentId={id} teacherId={user.id} readOnly />
          <GoalCard period="annual"     studentId={id} teacherId={user.id} readOnly />
        </div>
      </div>

      <CurrentPositionEditor studentId={id} initial={student} />

      <div className="card">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="font-semibold">Open mistakes</h2>
          <span className="text-xs text-slate-500">{mistakes.length}</span>
        </div>
        {mistakes.length === 0 ? (
          <div className="text-sm text-slate-500">None — alhamdulillah.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {mistakes.map((m) => {
              const meta = surahByNumber(m.surah_number);
              return (
                <li key={m.id} className="py-3 flex items-start gap-3">
                  <span className="pill bg-red-100 text-red-700">
                    {m.surah_number}:{m.ayah_number}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm">
                      <span className="font-medium">{meta?.name}</span>{' '}
                      <span className="text-slate-400">ayah {m.ayah_number}</span>
                    </div>
                    {m.note && <div className="text-xs text-slate-600 mt-1">{m.note}</div>}
                  </div>
                  <Link to={`/students/${id}/surah/${m.surah_number}`} className="btn-ghost text-xs">View</Link>
                  <button onClick={() => resolveMistake(m)} className="btn-ghost text-xs">Mark fixed</button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">Tuition</h2>
        <div className="mb-4">
          <label className="label">Default monthly rate (USD)</label>
          <p className="text-xs text-slate-500 mb-1">
            Pre-fills the amount when you mark a month paid. You can still type a different amount on any month.
          </p>
          <input
            className="input w-32"
            type="number"
            min="0"
            step="0.5"
            inputMode="decimal"
            placeholder="e.g. 50"
            value={!student.monthly_rate_cents ? '' : (student.monthly_rate_cents / 100).toString()}
            onChange={(e) =>
              updateRate(e.target.value === '' ? 0 : Math.round(Number(e.target.value) * 100))
            }
          />
        </div>
        <YearlyPaymentCalendar studentId={id} monthlyRateCents={student.monthly_rate_cents} />
      </div>
    </div>
  );
}
