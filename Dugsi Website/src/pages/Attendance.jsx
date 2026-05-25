import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';

const STATUSES = [
  { value: 'present', label: 'Present', cls: 'bg-emerald-100 text-emerald-800 ring-emerald-300' },
  { value: 'absent',  label: 'Absent',  cls: 'bg-red-100 text-red-800 ring-red-300' },
  { value: 'late',    label: 'Late',    cls: 'bg-amber-100 text-amber-800 ring-amber-300' },
  { value: 'excused', label: 'Excused', cls: 'bg-slate-100 text-slate-700 ring-slate-300' },
];

export default function Attendance() {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [students, setStudents] = useState([]);
  const [forDate, setForDate] = useState({}); // student_id -> attendance row
  const [monthAbsences, setMonthAbsences] = useState({}); // student_id -> int
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => { reload(); /* eslint-disable-line */ }, [user, date]);

  async function reload() {
    if (!user) return;
    setLoading(true);
    setErr(null);

    const monthStart = date.slice(0, 7) + '-01';
    const next = new Date(monthStart);
    next.setMonth(next.getMonth() + 1);
    const monthEnd = next.toISOString().slice(0, 10);

    const [{ data: ss }, { data: today }, { data: month }] = await Promise.all([
      supabase.from('profiles').select('id, full_name').eq('teacher_id', user.id).order('full_name'),
      supabase.from('attendance').select('*').eq('teacher_id', user.id).eq('date', date),
      supabase.from('attendance').select('student_id, status')
        .eq('teacher_id', user.id).gte('date', monthStart).lt('date', monthEnd).eq('status', 'absent'),
    ]);

    setStudents(ss ?? []);
    const map = {};
    for (const r of today ?? []) map[r.student_id] = r;
    setForDate(map);

    const absMap = {};
    for (const r of month ?? []) absMap[r.student_id] = (absMap[r.student_id] ?? 0) + 1;
    setMonthAbsences(absMap);

    setLoading(false);
  }

  async function setStatus(studentId, status) {
    const existing = forDate[studentId];
    const payload = {
      student_id: studentId,
      teacher_id: user.id,
      date,
      status,
    };
    const { data, error } = existing
      ? await supabase.from('attendance').update(payload).eq('id', existing.id).select().single()
      : await supabase.from('attendance').insert(payload).select().single();
    if (error) { setErr(error.message); return; }
    setForDate((m) => ({ ...m, [studentId]: data }));
    // refresh monthly counter
    reload();
  }

  async function markAllPresent() {
    if (!students.length) return;
    setErr(null);
    const rows = students.map((s) => ({
      student_id: s.id, teacher_id: user.id, date, status: 'present',
    }));
    const { error } = await supabase
      .from('attendance')
      .upsert(rows, { onConflict: 'student_id,date' });
    if (error) setErr(error.message);
    reload();
  }

  const flagged = useMemo(
    () => students.filter((s) => (monthAbsences[s.id] ?? 0) >= 2),
    [students, monthAbsences]
  );

  const todayAbsent = students.filter((s) => forDate[s.id]?.status === 'absent');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Attendance</h1>
          <p className="text-slate-500 text-sm">Track who showed up to halaqa.</p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="label">Class date</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <button className="btn-ghost" onClick={markAllPresent}>Mark all present</button>
        </div>
      </div>

      {err && <div className="card bg-red-50 border-red-200 text-red-700">{err}</div>}

      {flagged.length > 0 && (
        <div className="card bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-amber-700">⚠</span>
            <h2 className="font-semibold text-amber-900">Needs your attention this month</h2>
          </div>
          <p className="text-sm text-amber-900 mb-2">
            These students have missed 2 or more classes in {new Date(date).toLocaleString('en-US', { month: 'long', year: 'numeric' })}:
          </p>
          <ul className="text-sm text-amber-900 list-disc ml-5">
            {flagged.map((s) => (
              <li key={s.id}>
                <Link to={`/students/${s.id}`} className="hover:underline font-medium">{s.full_name}</Link>
                {' '}— {monthAbsences[s.id]} absences
              </li>
            ))}
          </ul>
        </div>
      )}

      {todayAbsent.length > 0 && (
        <div className="card bg-red-50 border-red-200">
          <h2 className="font-semibold text-red-900 mb-2">Absent today</h2>
          <ul className="text-sm text-red-900 list-disc ml-5">
            {todayAbsent.map((s) => <li key={s.id}>{s.full_name}</li>)}
          </ul>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : students.length === 0 ? (
          <div className="text-sm text-slate-500">No students yet.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {students.map((s) => {
              const cur = forDate[s.id]?.status;
              const absences = monthAbsences[s.id] ?? 0;
              return (
                <li key={s.id} className="py-3 flex flex-wrap items-center gap-3">
                  <div className="flex-1">
                    <Link to={`/students/${s.id}`} className="font-medium hover:underline">
                      {s.full_name}
                    </Link>
                    {absences > 0 && (
                      <span className="ml-2 pill bg-slate-100 text-slate-600">
                        {absences} absent this month
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {STATUSES.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setStatus(s.id, opt.value)}
                        className={`text-xs px-2 py-1 rounded-md ring-1 transition ${
                          cur === opt.value ? opt.cls : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
