export default function ProgressBar({ value, max, label, sub, color = 'bg-mosque' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <div className="text-sm font-medium text-slate-700">{label}</div>
        <div className="text-xs text-slate-500">
          {value.toLocaleString()} / {max.toLocaleString()} · {pct.toFixed(1)}%
        </div>
      </div>
      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
