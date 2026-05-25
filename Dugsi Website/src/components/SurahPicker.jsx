import { useState } from 'react';
import { SURAHS, surahByNumber } from '../lib/quran.js';

/**
 * Lets the user assemble a list of surahs for a goal.
 *
 * Props:
 *  - value: int[]            currently picked surah numbers
 *  - completed: int[]        which of those are marked complete (only relevant if showChecks)
 *  - onChange(next): list edited
 *  - onCompletedChange(next): completion list edited
 *  - readOnly: bool          hide controls
 *  - showChecks: bool        show a check-off box for each surah (true for monthly+ goals)
 */
export default function SurahPicker({
  value = [], completed = [], onChange, onCompletedChange, readOnly, showChecks,
}) {
  const [pick, setPick] = useState('');
  const available = SURAHS.filter((s) => !value.includes(s.n));

  function add() {
    if (!pick) return;
    onChange?.([...value, Number(pick)]);
    setPick('');
  }

  function remove(n) {
    onChange?.(value.filter((x) => x !== n));
    onCompletedChange?.(completed.filter((x) => x !== n));
  }

  function toggleComplete(n, on) {
    if (on) onCompletedChange?.([...completed, n]);
    else onCompletedChange?.(completed.filter((x) => x !== n));
  }

  return (
    <div>
      {!readOnly && (
        <div className="flex gap-2 mb-2">
          <select
            className="input flex-1"
            value={pick}
            onChange={(e) => setPick(e.target.value)}
          >
            <option value="">— pick a surah to add —</option>
            {available.map((s) => (
              <option key={s.n} value={s.n}>{s.n}. {s.name}</option>
            ))}
          </select>
          <button type="button" className="btn-ghost" disabled={!pick} onClick={add}>
            Add
          </button>
        </div>
      )}

      {value.length === 0 ? (
        <div className="text-sm text-slate-500">No surahs added.</div>
      ) : showChecks ? (
        <ul className="space-y-1.5">
          {value.map((n) => {
            const meta = surahByNumber(n);
            const done = completed.includes(n);
            return (
              <li key={n} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-mosque"
                  checked={done}
                  disabled={readOnly}
                  onChange={(e) => toggleComplete(n, e.target.checked)}
                />
                <span className={done ? 'line-through text-slate-400' : ''}>
                  {meta?.n}. {meta?.name}
                </span>
                <span className={`arabic text-base ${done ? 'text-slate-300' : 'text-slate-500'}`}>
                  {meta?.arabic}
                </span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => remove(n)}
                    className="ml-auto text-slate-400 hover:text-red-600 text-base leading-none"
                    aria-label={`Remove ${meta?.name}`}
                  >×</button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {value.map((n) => {
            const meta = surahByNumber(n);
            return (
              <span key={n} className="pill bg-slate-100 text-slate-700">
                {meta?.name}
                {!readOnly && (
                  <button
                    type="button"
                    className="ml-1 text-slate-400 hover:text-red-600"
                    onClick={() => remove(n)}
                  >×</button>
                )}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
