import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';

const COLORS = ['#0e6b5e', '#b08a3e', '#4f46e5', '#0891b2', '#dc2626', '#7c3aed', '#ea580c'];

/**
 * Same component for teacher and student.
 * Teacher: sees their own classes + can create / open.
 * Student: sees classes they're enrolled in.
 */
export default function Classes() {
  const { user, isTeacher } = useAuth();
  const [classes, setClasses] = useState([]);
  const [counts, setCounts] = useState({});           // class_id -> { students, assignments }
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // create form
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [creating, setCreating] = useState(false);

  useEffect(() => { reload(); /* eslint-disable-line */ }, [user]);

  async function reload() {
    if (!user) return;
    setLoading(true);
    setErr(null);
    let q = supabase.from('classes').select('*').order('created_at');
    if (isTeacher) q = q.eq('teacher_id', user.id);
    const { data, error } = await q;
    if (error) { setErr(error.message); setLoading(false); return; }
    setClasses(data ?? []);
    if (isTeacher && data?.length) {
      const ids = data.map((c) => c.id);
      const [{ data: enrolls }, { data: assigns }] = await Promise.all([
        supabase.from('class_enrollments').select('class_id').in('class_id', ids),
        supabase.from('assignments').select('class_id').in('class_id', ids),
      ]);
      const c = {};
      for (const id of ids) c[id] = { students: 0, assignments: 0 };
      for (const r of enrolls ?? []) c[r.class_id].students++;
      for (const r of assigns ?? []) c[r.class_id].assignments++;
      setCounts(c);
    }
    setLoading(false);
  }

  async function createClass(e) {
    e.preventDefault();
    setCreating(true); setErr(null);
    const { error } = await supabase.from('classes').insert({
      teacher_id: user.id, name, description, color,
    });
    setCreating(false);
    if (error) setErr(error.message);
    else {
      setName(''); setDescription(''); setColor(COLORS[0]); setShowNew(false);
      reload();
    }
  }

  async function deleteClass(c) {
    if (!confirm(`Delete the "${c.name}" class? All its announcements, assignments and roster will be removed.`)) return;
    const { error } = await supabase.from('classes').delete().eq('id', c.id);
    if (error) setErr(error.message);
    else reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Classes</h1>
          <p className="text-slate-500 text-sm">
            {isTeacher ? 'Subjects you teach.' : 'Classes you are part of.'}
          </p>
        </div>
        {isTeacher && (
          <button className="btn-primary" onClick={() => setShowNew(!showNew)}>
            {showNew ? 'Cancel' : '+ New class'}
          </button>
        )}
      </div>

      {showNew && isTeacher && (
        <form onSubmit={createClass} className="card space-y-3">
          <div>
            <label className="label">Class name</label>
            <input className="input" required value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Arabic, Fiqh, Tajweed, Hadith" />
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <textarea className="input min-h-[60px]" value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this class covers — for the students to see." />
          </div>
          <div>
            <label className="label">Color</label>
            <div className="flex gap-2 mt-1">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full ring-2 ${color === c ? 'ring-slate-900' : 'ring-transparent'}`}
                  style={{ background: c }} aria-label={c} />
              ))}
            </div>
          </div>
          {err && <div className="text-sm text-red-600">{err}</div>}
          <button className="btn-primary" disabled={creating || !name}>
            {creating ? 'Creating…' : 'Create class'}
          </button>
        </form>
      )}

      {err && !showNew && <div className="card bg-red-50 border-red-200 text-red-700">{err}</div>}

      {loading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : classes.length === 0 ? (
        <div className="card text-sm text-slate-500">
          {isTeacher ? 'No classes yet. Click "+ New class" to add your first subject.' : 'No classes yet.'}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((c) => {
            const cnt = counts[c.id] ?? { students: 0, assignments: 0 };
            return (
              <Link
                key={c.id} to={`/classes/${c.id}`}
                className="card hover:shadow-md transition relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-2" style={{ background: c.color }} />
                <div className="pt-2">
                  <h3 className="font-semibold text-lg">{c.name}</h3>
                  {c.description && (
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{c.description}</p>
                  )}
                  {isTeacher && (
                    <div className="mt-3 text-xs text-slate-500 flex gap-3">
                      <span>{cnt.students} student{cnt.students === 1 ? '' : 's'}</span>
                      <span>{cnt.assignments} assignment{cnt.assignments === 1 ? '' : 's'}</span>
                    </div>
                  )}
                </div>
                {isTeacher && (
                  <button
                    onClick={(e) => { e.preventDefault(); deleteClass(c); }}
                    className="absolute top-3 right-3 text-slate-300 hover:text-red-600 text-sm"
                    aria-label="Delete class"
                  >×</button>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
