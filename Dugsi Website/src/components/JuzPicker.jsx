import { useState } from 'react';
import { juzLabel } from '../lib/quran.js';

const JUZ_NUMBERS = Array.from({ length: 30 }, (_, i) => i + 1);

/**
 * Same shape as SurahPicker but for juz numbers (1..30).
 */
export default function JuzPicker({
  value = [], completed = [], onChange, onCompletedChange, readOnly, showChecks,
}) {
  const [pick, setPick] = useState('');
  const available = JUZ_NUMBERS.filter((n) => !value.includes(n));

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
            <option value="">— pick a juz to add —</option>
            {available.map((n) => (
              <option key={n} value={n}>{juzLabel(n)}</option>
            ))}
          </select>
          <button type="button" className="btn-ghost" disabled={!pick} onClick={add}>
            Add
          </button>
        </div>
      )}

      {value.length === 0 ? (
        <div className="text-sm text-slate-500">No juz added.</div>
      ) : showChecks ? (
        <ul className="space-y-1.5">
          {[...value].sort((a, b) => a - b).map((n) => {
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
                <span className={done ? 'line-through text-slate-400' : 'text-slate-800'}>
                  {juzLabel(n)}
                </span>
                {!readOnly && (
                  <button
                    type="button" onClick={() => remove(n)}
                    className="ml-auto text-slate-400 hover:text-red-600 text-base leading-none"
                    aria-label={`Remove juz ${n}`}
                  >×</button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {[...value].sort((a, b) => a - b).map((n) => (
            <span key={n} className="pill bg-indigo-50 text-indigo-700">
              Juz {n}
              {!readOnly && (
                <button
                  type="button"
                  className="ml-1 text-indigo-300 hover:text-red-600"
                  onClick={() => remove(n)}
                >×</button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
