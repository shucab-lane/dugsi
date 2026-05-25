import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { fetchSurah, surahByNumber } from '../lib/quran.js';
import MistakeModal from './MistakeModal.jsx';

/**
 * Renders an Arabic surah with tappable ayahs.
 * - readOnly=true (student view): ayahs with open mistakes are highlighted red; tapping shows the note.
 * - readOnly=false (teacher view): tapping any ayah opens the mistake modal to add/edit/remove.
 */
export default function SurahViewer({ studentId, teacherId, surahNumber, readOnly }) {
  const meta = surahByNumber(surahNumber);
  const [surah, setSurah] = useState(null);
  const [mistakes, setMistakes] = useState([]);
  const [loadingText, setLoadingText] = useState(true);
  const [error, setError] = useState(null);
  const [modalAyah, setModalAyah] = useState(null);

  useEffect(() => {
    setLoadingText(true);
    setError(null);
    fetchSurah(surahNumber)
      .then((s) => setSurah(s))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingText(false));
  }, [surahNumber]);

  useEffect(() => {
    if (!studentId) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('mistakes')
        .select('*')
        .eq('student_id', studentId)
        .eq('surah_number', surahNumber);
      if (!active) return;
      if (error) setError(error.message);
      else setMistakes(data ?? []);
    })();
    return () => { active = false; };
  }, [studentId, surahNumber]);

  const mistakeByAyah = useMemo(() => {
    const m = new Map();
    for (const x of mistakes) if (!x.resolved_at) m.set(x.ayah_number, x);
    return m;
  }, [mistakes]);

  async function upsertMistake(ayahNumber, note) {
    const existing = mistakes.find((m) => m.ayah_number === ayahNumber);
    let row;
    if (existing) {
      const { data, error } = await supabase
        .from('mistakes')
        .update({ note, resolved_at: null })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      row = data;
    } else {
      const { data, error } = await supabase
        .from('mistakes')
        .insert({
          student_id: studentId,
          teacher_id: teacherId,
          surah_number: surahNumber,
          ayah_number: ayahNumber,
          note: note || null,
        })
        .select()
        .single();
      if (error) throw error;
      row = data;
    }
    setMistakes((prev) => {
      const others = prev.filter((m) => m.id !== row.id);
      return [...others, row];
    });
    setModalAyah(null);
  }

  async function resolveMistake(ayahNumber) {
    const existing = mistakes.find((m) => m.ayah_number === ayahNumber);
    if (!existing) return;
    const { data, error } = await supabase
      .from('mistakes')
      .update({ resolved_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    setMistakes((prev) => prev.map((m) => (m.id === data.id ? data : m)));
    setModalAyah(null);
  }

  async function deleteMistake(ayahNumber) {
    const existing = mistakes.find((m) => m.ayah_number === ayahNumber);
    if (!existing) return;
    const { error } = await supabase.from('mistakes').delete().eq('id', existing.id);
    if (error) throw error;
    setMistakes((prev) => prev.filter((m) => m.id !== existing.id));
    setModalAyah(null);
  }

  if (!meta) return <div className="text-red-600">Unknown surah {surahNumber}.</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm text-slate-500">Surah {meta.n}</div>
          <h1 className="text-2xl font-semibold">
            {meta.name} <span className="arabic text-2xl text-slate-600 ml-2">{meta.arabic}</span>
          </h1>
          <div className="text-xs text-slate-500 mt-1">{meta.ayahs} ayahs</div>
        </div>
      </div>

      {error && <div className="card bg-red-50 border-red-200 text-red-700 mb-4">{error}</div>}

      <div className="card">
        {loadingText && <div className="text-slate-500">Loading surah…</div>}
        {surah && (
          <div className="arabic text-2xl sm:text-3xl">
            {surah.ayahs.map((a) => {
              const m = mistakeByAyah.get(a.n);
              const baseCls = 'inline cursor-pointer rounded-md px-1 py-0.5 transition select-text';
              const stateCls = m
                ? 'bg-red-100 text-red-900 hover:bg-red-200'
                : readOnly
                  ? 'hover:bg-slate-50'
                  : 'hover:bg-amber-50';
              return (
                <span
                  key={a.n}
                  className={`${baseCls} ${stateCls}`}
                  title={m?.note ?? (readOnly ? '' : 'Tap to mark mistake')}
                  onClick={() => {
                    if (readOnly && !m) return; // students only "tap" highlighted ones
                    setModalAyah(a.n);
                  }}
                >
                  {a.text}
                  <span className="inline-block mx-1 align-middle text-xs font-sans text-slate-400 border border-slate-300 rounded-full w-7 h-7 leading-6 text-center">
                    {a.n}
                  </span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      <MistakeModal
        open={modalAyah !== null}
        onClose={() => setModalAyah(null)}
        ayah={modalAyah ?? ''}
        mistake={modalAyah ? mistakeByAyah.get(modalAyah) : null}
        onSave={readOnly ? () => setModalAyah(null) : (note) => upsertMistake(modalAyah, note)}
        onResolve={readOnly ? () => setModalAyah(null) : () => resolveMistake(modalAyah)}
        onDelete={readOnly ? () => setModalAyah(null) : () => deleteMistake(modalAyah)}
      />
    </div>
  );
}
