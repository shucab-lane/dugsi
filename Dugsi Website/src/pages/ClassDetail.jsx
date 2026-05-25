import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function ClassDetail() {
  const { id } = useParams();
  const { user, isTeacher } = useAuth();
  const [klass, setKlass] = useState(null);
  const [tab, setTab] = useState('stream');
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('classes').select('*').eq('id', id).single();
      if (error) setErr(error.message);
      else setKlass(data);
    })();
  }, [id]);

  if (err) return <div className="card bg-red-50 border-red-200 text-red-700">{err}</div>;
  if (!klass) return <div className="text-slate-500">Loading…</div>;

  const tabs = isTeacher
    ? ['stream', 'assignments', 'roster']
    : ['stream', 'assignments'];

  return (
    <div className="space-y-6">
      <div>
        <Link to="/classes" className="text-sm text-mosque hover:underline">← All classes</Link>
        <div className="mt-2 rounded-2xl overflow-hidden bg-white border border-slate-200">
          <div className="h-20" style={{ background: klass.color || '#0e6b5e' }} />
          <div className="p-4">
            <h1 className="text-2xl font-semibold">{klass.name}</h1>
            {klass.description && <p className="text-slate-600 text-sm mt-1">{klass.description}</p>}
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize ${
              tab === t
                ? 'border-mosque text-mosque'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'stream'      && <StreamTab classId={id} isTeacher={isTeacher} teacherId={user.id} />}
      {tab === 'assignments' && <AssignmentsTab classId={id} isTeacher={isTeacher} teacherId={user.id} userId={user.id} />}
      {tab === 'roster'      && isTeacher && <RosterTab classId={id} teacherId={user.id} />}
    </div>
  );
}

/* =================== Stream =================== */
function StreamTab({ classId, isTeacher, teacherId }) {
  const [items, setItems] = useState([]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => { reload(); /* eslint-disable-line */ }, [classId]);

  async function reload() {
    setErr(null);
    const { data, error } = await supabase
      .from('announcements').select('*')
      .eq('class_id', classId).order('created_at', { ascending: false });
    if (error) setErr(error.message); else setItems(data ?? []);
  }

  async function post(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    const { error } = await supabase.from('announcements').insert({
      class_id: classId, teacher_id: teacherId, body: body.trim(),
    });
    setBusy(false);
    if (error) setErr(error.message);
    else { setBody(''); reload(); }
  }

  async function del(idToDelete) {
    if (!confirm('Delete this post?')) return;
    const { error } = await supabase.from('announcements').delete().eq('id', idToDelete);
    if (error) setErr(error.message); else reload();
  }

  return (
    <div className="space-y-4">
      {isTeacher && (
        <form onSubmit={post} className="card">
          <label className="label">Post an announcement</label>
          <textarea className="input mt-1 min-h-[80px]" value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="e.g. No class this Saturday. Make up next week, inshallah." />
          <div className="mt-3 flex items-center gap-3">
            <button className="btn-primary" disabled={busy || !body.trim()}>
              {busy ? 'Posting…' : 'Post'}
            </button>
            {err && <span className="text-sm text-red-600">{err}</span>}
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <div className="card text-sm text-slate-500">No announcements yet.</div>
      ) : (
        items.map((a) => (
          <div key={a.id} className="card">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs text-slate-500">{new Date(a.created_at).toLocaleString()}</span>
              {isTeacher && (
                <button onClick={() => del(a.id)} className="text-xs text-slate-400 hover:text-red-600">
                  Delete
                </button>
              )}
            </div>
            <div className="text-sm text-slate-800 whitespace-pre-wrap">{a.body}</div>
          </div>
        ))
      )}
    </div>
  );
}

/* =================== Assignments =================== */
function AssignmentsTab({ classId, isTeacher, teacherId, userId }) {
  const [items, setItems] = useState([]);
  const [completions, setCompletions] = useState({}); // assignment_id -> row (student view) OR map assignment_id -> [{student_id, completed_at}] (teacher)
  const [roster, setRoster] = useState([]);
  const [err, setErr] = useState(null);

  // create form (teacher only)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { reload(); /* eslint-disable-line */ }, [classId]);

  async function reload() {
    setErr(null);
    const { data: assigns, error } = await supabase
      .from('assignments').select('*')
      .eq('class_id', classId).order('due_date', { ascending: true, nullsFirst: false });
    if (error) { setErr(error.message); return; }
    setItems(assigns ?? []);

    if (isTeacher && assigns?.length) {
      // pull all completions + class roster
      const aids = assigns.map((a) => a.id);
      const [{ data: comps }, { data: enrolls }] = await Promise.all([
        supabase.from('assignment_completions').select('*').in('assignment_id', aids),
        supabase.from('class_enrollments').select('student_id, profiles:profiles!class_enrollments_student_id_fkey(full_name)')
          .eq('class_id', classId),
      ]);
      const m = {};
      for (const a of aids) m[a] = [];
      for (const c of comps ?? []) m[c.assignment_id]?.push(c);
      setCompletions(m);
      setRoster(
        (enrolls ?? []).map((e) => ({ id: e.student_id, full_name: e.profiles?.full_name ?? '(unknown)' }))
      );
    } else if (!isTeacher && assigns?.length) {
      const aids = assigns.map((a) => a.id);
      const { data: mine } = await supabase
        .from('assignment_completions').select('*')
        .in('assignment_id', aids).eq('student_id', userId);
      const m = {};
      for (const c of mine ?? []) m[c.assignment_id] = c;
      setCompletions(m);
    }
  }

  async function create(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    const { error } = await supabase.from('assignments').insert({
      class_id: classId, teacher_id: teacherId,
      title: title.trim(), description: description.trim() || null,
      due_date: dueDate || null,
    });
    setBusy(false);
    if (error) setErr(error.message);
    else { setTitle(''); setDescription(''); setDueDate(''); setShowNew(false); reload(); }
  }

  async function del(id) {
    if (!confirm('Delete this assignment?')) return;
    const { error } = await supabase.from('assignments').delete().eq('id', id);
    if (error) setErr(error.message); else reload();
  }

  async function toggleMyDone(assignmentId) {
    const existing = completions[assignmentId];
    if (existing) {
      const { error } = await supabase.from('assignment_completions').delete().eq('id', existing.id);
      if (error) { setErr(error.message); return; }
    } else {
      const { error } = await supabase.from('assignment_completions').insert({
        assignment_id: assignmentId, student_id: userId,
      });
      if (error) { setErr(error.message); return; }
    }
    reload();
  }

  return (
    <div className="space-y-4">
      {isTeacher && (
        <div>
          <button className="btn-primary" onClick={() => setShowNew(!showNew)}>
            {showNew ? 'Cancel' : '+ New assignment'}
          </button>
        </div>
      )}

      {showNew && isTeacher && (
        <form onSubmit={create} className="card space-y-3">
          <div>
            <label className="label">Title</label>
            <input className="input" required value={title}
              onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Memorize Surah Al-Kahf 1–10" />
          </div>
          <div>
            <label className="label">Instructions (optional)</label>
            <textarea className="input min-h-[80px]" value={description}
              onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="label">Due date (optional)</label>
            <input type="date" className="input w-44" value={dueDate}
              onChange={(e) => setDueDate(e.target.value)} />
          </div>
          {err && <div className="text-sm text-red-600">{err}</div>}
          <button className="btn-primary" disabled={busy || !title.trim()}>
            {busy ? 'Posting…' : 'Post assignment'}
          </button>
        </form>
      )}

      {err && !showNew && <div className="card bg-red-50 border-red-200 text-red-700">{err}</div>}

      {items.length === 0 ? (
        <div className="card text-sm text-slate-500">No assignments yet.</div>
      ) : (
        items.map((a) => {
          if (isTeacher) {
            const comps = completions[a.id] ?? [];
            const doneIds = new Set(comps.map((c) => c.student_id));
            return (
              <div key={a.id} className="card">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{a.title}</h3>
                    {a.description && <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{a.description}</p>}
                  </div>
                  <button onClick={() => del(a.id)} className="text-xs text-slate-400 hover:text-red-600">
                    Delete
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                  {a.due_date ? <span>Due {new Date(a.due_date).toLocaleDateString()}</span> : <span>No due date</span>}
                  <span>· {comps.length} / {roster.length} done</span>
                </div>
                {roster.length > 0 && (
                  <div className="mt-3 text-xs">
                    <details>
                      <summary className="cursor-pointer text-slate-500 hover:text-slate-800">
                        Who's done it
                      </summary>
                      <ul className="mt-2 grid sm:grid-cols-2 gap-1">
                        {roster.map((s) => (
                          <li key={s.id} className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${doneIds.has(s.id) ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            <span className={doneIds.has(s.id) ? 'text-slate-800' : 'text-slate-500'}>{s.full_name}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </div>
                )}
              </div>
            );
          }

          // student view
          const myDone = completions[a.id];
          const overdue = a.due_date && !myDone && new Date(a.due_date) < new Date(new Date().toDateString());
          return (
            <div key={a.id} className="card">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 w-5 h-5 accent-mosque"
                  checked={!!myDone}
                  onChange={() => toggleMyDone(a.id)}
                />
                <div className="flex-1">
                  <h3 className={`font-semibold ${myDone ? 'line-through text-slate-400' : ''}`}>{a.title}</h3>
                  {a.description && <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{a.description}</p>}
                  <div className="mt-2 text-xs">
                    {a.due_date && (
                      <span className={overdue ? 'text-red-600 font-medium' : 'text-slate-500'}>
                        Due {new Date(a.due_date).toLocaleDateString()}
                        {overdue && ' · overdue'}
                      </span>
                    )}
                    {myDone && <span className="text-emerald-700 ml-2">✓ done</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/* =================== Roster =================== */
function RosterTab({ classId, teacherId }) {
  const [enrolled, setEnrolled] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => { reload(); /* eslint-disable-line */ }, [classId]);

  async function reload() {
    setErr(null);
    const [{ data: ens }, { data: ss }] = await Promise.all([
      supabase.from('class_enrollments')
        .select('id, student_id, profiles:profiles!class_enrollments_student_id_fkey(full_name)')
        .eq('class_id', classId),
      supabase.from('profiles').select('id, full_name')
        .eq('teacher_id', teacherId).order('full_name'),
    ]);
    setEnrolled((ens ?? []).map((e) => ({
      enrollment_id: e.id, id: e.student_id, full_name: e.profiles?.full_name ?? '(unknown)',
    })));
    setAllStudents(ss ?? []);
  }

  async function add(studentId) {
    const { error } = await supabase.from('class_enrollments').insert({
      class_id: classId, student_id: studentId,
    });
    if (error) setErr(error.message); else reload();
  }

  async function remove(enrollmentId) {
    const { error } = await supabase.from('class_enrollments').delete().eq('id', enrollmentId);
    if (error) setErr(error.message); else reload();
  }

  const enrolledIds = new Set(enrolled.map((s) => s.id));
  const notEnrolled = allStudents.filter((s) => !enrolledIds.has(s.id));

  return (
    <div className="space-y-4">
      {err && <div className="card bg-red-50 border-red-200 text-red-700">{err}</div>}

      <div className="card">
        <h3 className="font-semibold mb-3">In this class ({enrolled.length})</h3>
        {enrolled.length === 0 ? (
          <div className="text-sm text-slate-500">No students enrolled yet.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {enrolled.map((s) => (
              <li key={s.enrollment_id} className="py-2 flex items-center justify-between">
                <span>{s.full_name}</span>
                <button onClick={() => remove(s.enrollment_id)} className="btn-ghost text-xs">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h3 className="font-semibold mb-3">Add students</h3>
        {notEnrolled.length === 0 ? (
          <div className="text-sm text-slate-500">All your students are already in this class.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {notEnrolled.map((s) => (
              <li key={s.id} className="py-2 flex items-center justify-between">
                <span>{s.full_name}</span>
                <button onClick={() => add(s.id)} className="btn-primary text-xs">
                  + Add
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
