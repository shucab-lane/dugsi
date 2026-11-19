import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { SURAHS, juzOf, surahByNumber } from '../lib/quran.js';

/**
 * Lets either the teacher or the student set the student's current surah/ayah.
 * RLS already permits both (students own their profile; teachers can edit their
 * students' profiles), so no extra policies are needed.
 */
// "" when the saved value is 0 or null, so the input renders empty
// instead of showing a stray zero the user has to delete first.
const blankIfZero = (v) => (v === 0 || v == null ? '' : String(v));

export default function CurrentPositionEditor({ studentId, initial }) {
  const [surah, setSurah] = useState(blankIfZero(initial?.current_surah));
  const [ayah, setAyah]   = useState(blankIfZero(initial?.current_ayah));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    setSurah(blankIfZero(initial?.current_surah));
    setAyah(blankIfZero(initial?.current_ayah));
  }, [initial?.current_surah, initial?.current_ayah]);

  async function save(newSurah, newAyah) {
    setSaving(true); setErr(null);
    const { error } = await supabase
      .from('profiles')
      .update({
        current_surah: newSurah ? Number(newSurah) : null,
        current_ayah:  newAyah  ? Number(newAyah)  : null,
      })
      .eq('id', studentId);
    setSaving(false);
    if (error) setErr(error.message);
    else setSavedAt(Date.now());
  }

  const currentJuz = surah ? juzOf(Number(surah), Number(ayah) || 1) : null;
  const meta = surah ? surahByNumber(Number(surah)) : null;

  return (
    <div className="card">
      <h2 className="font-semibold mb-2">Where you are in the Quran</h2>
      <p className="text-xs text-slate-500 mb-3">
        Update this whenever you move to a new surah or ayah. Your teacher uses it to group students by juz.
      </p>
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="label">Surah</label>
          <select
            className="input"
            value={surah}
            onChange={(e) => { setSurah(e.target.value); save(e.target.value, ayah); }}
          >
            <option value="">— not set —</option>
            {SURAHS.map((s) => (
              <option key={s.n} value={s.n}>{s.n}. {s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Ayah</label>
          <input
            className="input" type="number" min="1"
            inputMode="numeric"
            placeholder="e.g. 1"
            value={ayah}
            onChange={(e) => setAyah(e.target.value)}
            onBlur={(e) => save(surah, e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <div className="text-sm">
            <div className="text-slate-500 text-xs">Juz</div>
            <div className="text-xl font-semibold">{currentJuz ?? '—'}</div>
          </div>
        </div>
      </div>
      <div className="mt-2 text-xs text-slate-500 min-h-[1em]">
        {err ? <span className="text-red-600">{err}</span>
         : saving ? 'Saving…'
         : meta ? `Set to ${meta.name}${ayah ? ' ayah ' + ayah : ''}.`
         : ''}
      </div>
    </div>
  );
}
