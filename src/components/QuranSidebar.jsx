import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { SURAHS } from '../lib/quran.js';

/**
 * Left sidebar listing all 114 surahs.
 * Shows the number of OPEN (unresolved) mistakes per surah for `studentId`.
 * Clicking a surah calls onPick(n).
 */
export default function QuranSidebar({ studentId, currentSurah, onPick }) {
  const [counts, setCounts] = useState({}); // surah_number -> int
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!studentId) return;
    (async () => {
      const { data } = await supabase
        .from('mistakes')
        .select('surah_number')
        .eq('student_id', studentId)
        .is('resolved_at', null);
      const c = {};
      for (const r of data ?? []) c[r.surah_number] = (c[r.surah_number] ?? 0) + 1;
      setCounts(c);
    })();
  }, [studentId, currentSurah]);

  const visible = useMemo(() => {
    if (!filter.trim()) return SURAHS;
    const q = filter.trim().toLowerCase();
    return SURAHS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        String(s.n).includes(q) ||
        s.arabic.includes(filter.trim())
    );
  }, [filter]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="p-3 border-b border-slate-100">
        <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">All surahs</div>
        <input
          type="search"
          className="input"
          placeholder="Search by name or number…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <ul className="max-h-[70vh] overflow-y-auto">
        {visible.map((s) => {
          const open = counts[s.n] ?? 0;
          const active = Number(currentSurah) === s.n;
          return (
            <li key={s.n}>
              <button
                onClick={() => onPick(s.n)}
                className={`w-full text-left px-3 py-2 flex items-center gap-3 border-b border-slate-50 transition ${
                  active ? 'bg-mosque/10 text-mosque' : 'hover:bg-slate-50'
                }`}
              >
                <span className={`w-7 text-xs font-mono ${active ? 'text-mosque' : 'text-slate-400'}`}>
                  {s.n}
                </span>
                <span className="flex-1 truncate">
                  <span className={active ? 'font-semibold' : 'text-slate-800'}>{s.name}</span>
                  <span className="arabic ml-2 text-slate-500">{s.arabic}</span>
                </span>
                <span className="text-xs text-slate-400">{s.ayahs}</span>
                {open > 0 && (
                  <span className="pill bg-red-100 text-red-700 ml-1">{open}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
