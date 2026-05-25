import { useState, useEffect } from 'react';

export default function MistakeModal({ open, onClose, ayah, mistake, onSave, onResolve, onDelete }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setNote(mistake?.note ?? '');
  }, [open, mistake]);

  if (!open) return null;

  async function handleSave() {
    setBusy(true);
    try { await onSave(note); } finally { setBusy(false); }
  }
  async function handleResolve() {
    setBusy(true);
    try { await onResolve(); } finally { setBusy(false); }
  }
  async function handleDelete() {
    setBusy(true);
    try { await onDelete(); } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-semibold text-lg">Mistake on ayah {ayah}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
        <label className="label">Note (tajweed, makharij, forgot…)</label>
        <textarea
          className="input mt-1 min-h-[100px]"
          value={note}
          placeholder="e.g. Forgot the word, mispronounced ض"
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="mt-4 flex flex-wrap gap-2 justify-end">
          {mistake && (
            <button className="btn-ghost" onClick={handleDelete} disabled={busy}>
              Remove mark
            </button>
          )}
          {mistake && (
            <button className="btn-ghost" onClick={handleResolve} disabled={busy}>
              Mark fixed
            </button>
          )}
          <button className="btn-primary" onClick={handleSave} disabled={busy}>
            {busy ? 'Saving…' : mistake ? 'Update' : 'Mark mistake'}
          </button>
        </div>
      </div>
    </div>
  );
}
