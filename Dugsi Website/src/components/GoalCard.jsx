import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import ProgressBar from './ProgressBar.jsx';
import SurahPicker from './SurahPicker.jsx';
import JuzPicker from './JuzPicker.jsx';

const PERIODS = {
  weekly:     { label: 'This week',     color: 'bg-mosque',     basis: 'ayahs' },
  monthly:    { label: 'This month',    color: 'bg-gold',       basis: 'units' },
  six_months: { label: 'This 6 months', color: 'bg-indigo-600', basis: 'units' },
  annual:     { label: 'This year',     color: 'bg-emerald-600', basis: 'units' },
};

/** [periodStart, periodEnd) (YYYY-MM-DD) for the period containing `now`. */
export function periodRange(period, now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  let start, end;
  if (period === 'weekly') {
    const day = d.getDay() || 7;
    start = new Date(d); start.setDate(d.getDate() - (day - 1));
    end = new Date(start); end.setDate(start.getDate() + 7);
  } else if (period === 'monthly') {
    start = new Date(d.getFullYear(), d.getMonth(), 1);
    end   = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  } else if (period === 'six_months') {
    const halfStart = d.getMonth() < 6 ? 0 : 6;
    start = new Date(d.getFullYear(), halfStart, 1);
    end   = new Date(d.getFullYear(), halfStart + 6, 1);
  } else {
    start = new Date(d.getFullYear(), 0, 1);
    end   = new Date(d.getFullYear() + 1, 0, 1);
  }
  const fmt = (x) => x.toISOString().slice(0, 10);
  return [fmt(start), fmt(end)];
}

export default function GoalCard({ period, studentId, teacherId, readOnly }) {
  const meta = PERIODS[period];
  const [start, end] = periodRange(period);
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [err, setErr] = useState(null);

  // editable fields
  const [text, setText] = useState('');
  const [targetAyahs, setTargetAyahs]       = useState(0);
  const [completedAyahs, setCompletedAyahs] = useState(0);
  const [targetSurahs, setTargetSurahs]       = useState([]);
  const [completedSurahs, setCompletedSurahs] = useState([]);
  const [targetJuz, setTargetJuz]       = useState([]);
  const [completedJuz, setCompletedJuz] = useState([]);

  useEffect(() => { load(); /* eslint-disable-line */ }, [studentId, period]);

  async function load() {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from('goals').select('*')
      .eq('student_id', studentId)
      .eq('period_type', period)
      .eq('period_start', start)
      .maybeSingle();
    if (error) setErr(error.message);
    setGoal(data ?? null);
    setText(data?.target_text ?? '');
    setTargetAyahs(data?.target_ayahs ?? 0);
    setCompletedAyahs(data?.completed_ayahs ?? 0);
    setTargetSurahs(data?.target_surahs ?? []);
    setCompletedSurahs(data?.completed_surahs ?? []);
    setTargetJuz(data?.target_juz ?? []);
    setCompletedJuz(data?.completed_juz ?? []);
    setEditing(!data && !readOnly);
    setLoading(false);
  }

  async function save(overrides = {}) {
    setErr(null);
    const payload = {
      student_id: studentId,
      teacher_id: teacherId,
      period_type: period,
      period_start: start,
      period_end: end,
      target_text: text,
      target_ayahs: targetAyahs,
      completed_ayahs: completedAyahs,
      target_surahs: targetSurahs,
      completed_surahs: completedSurahs,
      target_juz: targetJuz,
      completed_juz: completedJuz,
      ...overrides,
    };
    const { data, error } = goal
      ? await supabase.from('goals').update(payload).eq('id', goal.id).select().single()
      : await supabase.from('goals').upsert(payload, { onConflict: 'student_id,period_type,period_start' }).select().single();
    if (error) { setErr(error.message); return null; }
    setGoal(data);
    setEditing(false);
    return data;
  }

  async function bumpAyah() {
    if (!goal || meta.basis !== 'ayahs') return;
    const nextDone = Math.min(goal.completed_ayahs + 1, goal.target_ayahs);
    const updated = await save({ completed_ayahs: nextDone });
    if (updated) setCompletedAyahs(nextDone);
  }

  async function setSurahDone(nextCompletedSurahs) {
    if (!goal) return;
    const updated = await save({ completed_surahs: nextCompletedSurahs });
    if (updated) setCompletedSurahs(nextCompletedSurahs);
  }

  async function setJuzDone(nextCompletedJuz) {
    if (!goal) return;
    const updated = await save({ completed_juz: nextCompletedJuz });
    if (updated) setCompletedJuz(nextCompletedJuz);
  }

  if (loading) return <div className="card text-sm text-slate-500">Loading {meta.label.toLowerCase()}…</div>;

  // --------- VIEW (not editing) ---------
  if (!editing) {
    if (!goal) {
      return (
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-slate-500">{meta.label}</div>
          <div className="text-sm text-slate-500 mt-2">No goal set yet.</div>
          {!readOnly && (
            <button className="btn-ghost text-sm mt-3" onClick={() => setEditing(true)}>Set goal</button>
          )}
        </div>
      );
    }

    if (meta.basis === 'ayahs') {
      const hasSurahHints = goal.target_surahs?.length > 0;
      return (
        <div className="card">
          <ProgressBar
            label={`${meta.label} — ${goal.target_text}`}
            value={goal.completed_ayahs}
            max={goal.target_ayahs || 1}
            color={meta.color}
          />
          {hasSurahHints && (
            <div className="mt-3">
              <div className="text-xs text-slate-500 mb-1">Hoping to cover:</div>
              <SurahPicker value={goal.target_surahs} readOnly showChecks={false} />
            </div>
          )}
          {!readOnly && (
            <div className="mt-3 flex gap-2">
              <button onClick={() => setEditing(true)} className="btn-ghost text-sm">Edit</button>
              <button onClick={bumpAyah} className="btn-primary text-sm"
                disabled={goal.completed_ayahs >= goal.target_ayahs}>+1 ayah</button>
            </div>
          )}
        </div>
      );
    }

    // Monthly / 6mo / Annual: surahs + juz checklist
    const totalSurahs = goal.target_surahs?.length ?? 0;
    const totalJuz    = goal.target_juz?.length ?? 0;
    const doneSurahs  = goal.completed_surahs?.length ?? 0;
    const doneJuz     = goal.completed_juz?.length ?? 0;
    const total = totalSurahs + totalJuz;
    const done  = doneSurahs + doneJuz;
    const subParts = [];
    if (totalSurahs) subParts.push(`${doneSurahs}/${totalSurahs} surah${totalSurahs === 1 ? '' : 's'}`);
    if (totalJuz)    subParts.push(`${doneJuz}/${totalJuz} juz`);

    return (
      <div className="card">
        <ProgressBar
          label={`${meta.label} — ${goal.target_text}`}
          value={done}
          max={total || 1}
          color={meta.color}
          sub={subParts.join(' · ') || 'no items added'}
        />
        {totalJuz > 0 && (
          <div className="mt-4">
            <div className="text-xs text-slate-500 mb-1">Juz</div>
            <JuzPicker
              value={goal.target_juz ?? []}
              completed={goal.completed_juz ?? []}
              showChecks readOnly={readOnly}
              onCompletedChange={setJuzDone}
            />
          </div>
        )}
        {totalSurahs > 0 && (
          <div className="mt-4">
            <div className="text-xs text-slate-500 mb-1">Surahs</div>
            <SurahPicker
              value={goal.target_surahs ?? []}
              completed={goal.completed_surahs ?? []}
              showChecks readOnly={readOnly}
              onCompletedChange={setSurahDone}
            />
          </div>
        )}
        {!readOnly && (
          <div className="mt-4">
            <button onClick={() => setEditing(true)} className="btn-ghost text-sm">Edit items</button>
          </div>
        )}
      </div>
    );
  }

  // --------- EDIT mode ---------
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">{meta.label} goal</div>
      <input
        className="input mb-3"
        placeholder={meta.basis === 'ayahs' ? 'e.g. Keep building Surah Mulk' : 'e.g. Memorize juz 29 and 30'}
        value={text} onChange={(e) => setText(e.target.value)}
      />

      {meta.basis === 'ayahs' ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="label">Target ayahs</div>
              <input className="input" type="number" min="0" inputMode="numeric" placeholder="e.g. 20"
                value={targetAyahs === 0 ? '' : targetAyahs}
                onChange={(e) => setTargetAyahs(e.target.value === '' ? 0 : Number(e.target.value))} />
            </div>
            <div>
              <div className="label">Completed</div>
              <input className="input" type="number" min="0" inputMode="numeric" placeholder="0"
                value={completedAyahs === 0 ? '' : completedAyahs}
                onChange={(e) => setCompletedAyahs(e.target.value === '' ? 0 : Number(e.target.value))} />
            </div>
          </div>
          <div className="mt-3">
            <div className="label mb-1">Surahs you might cover (optional)</div>
            <SurahPicker
              value={targetSurahs} onChange={setTargetSurahs}
              completed={[]} onCompletedChange={() => {}}
              showChecks={false}
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <div className="label mb-1">Juz to memorize</div>
            <p className="text-xs text-slate-500 mb-1">
              Faster than adding every surah — one tick checks off the whole juz.
            </p>
            <JuzPicker
              value={targetJuz} onChange={setTargetJuz}
              completed={completedJuz} onCompletedChange={setCompletedJuz}
              showChecks
            />
          </div>
          <div className="mt-4">
            <div className="label mb-1">Individual surahs to memorize</div>
            <SurahPicker
              value={targetSurahs} onChange={setTargetSurahs}
              completed={completedSurahs} onCompletedChange={setCompletedSurahs}
              showChecks
            />
          </div>
        </>
      )}

      {err && <div className="text-xs text-red-600 mt-2">{err}</div>}
      <div className="mt-3 flex gap-2">
        <button
          className="btn-primary text-sm"
          onClick={() => save()}
          disabled={
            !text ||
            (meta.basis === 'ayahs'
              ? targetAyahs <= 0
              : targetSurahs.length === 0 && targetJuz.length === 0)
          }
        >
          Save
        </button>
        {goal && (
          <button className="btn-ghost text-sm" onClick={() => { setEditing(false); load(); }}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
