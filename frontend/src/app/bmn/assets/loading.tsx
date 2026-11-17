export default function BmnAssetsLoading() {
  return (
    <div className="p-6 md:p-10 space-y-6 animate-pulse">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="space-y-2">
          <div className="h-9 w-72 bg-[var(--ds-surface-muted)] rounded-lg" />
          <div className="h-4 w-96 bg-[var(--ds-surface-muted)] rounded-lg" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-64 bg-[var(--ds-surface-muted)] rounded-lg" />
          <div className="h-10 w-36 bg-[var(--ds-surface-muted)] rounded-lg" />
        </div>
      </div>
      <div className="bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50/70 dark:bg-zinc-800/30 border-b border-slate-200/70 dark:border-zinc-800 flex gap-4">
          {[200, 180, 160, 160, 80].map((w, i) => (
            <div key={i} className="h-4 bg-[var(--ds-surface-muted)] rounded-sm" style={{ width: w }} />
          ))}
        </div>
        <div className="divide-y divide-slate-200/70 dark:divide-zinc-800">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-4 flex gap-6">
              <div className="space-y-2 w-40">
                <div className="h-4 bg-[var(--ds-surface-muted)] rounded-sm w-32" />
                <div className="h-3 bg-[var(--ds-surface-muted)] rounded-sm w-20" />
              </div>
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-[var(--ds-surface-muted)] rounded-sm w-48" />
                <div className="h-3 bg-[var(--ds-surface-muted)] rounded-sm w-32" />
              </div>
              <div className="space-y-2 w-36">
                <div className="h-4 bg-[var(--ds-surface-muted)] rounded-sm w-28" />
                <div className="h-5 bg-[var(--ds-surface-muted)] rounded-full w-16" />
              </div>
              <div className="space-y-2 w-40">
                <div className="h-3 bg-[var(--ds-surface-muted)] rounded-sm w-32" />
                <div className="h-6 bg-[var(--ds-surface-muted)] rounded-sm w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
