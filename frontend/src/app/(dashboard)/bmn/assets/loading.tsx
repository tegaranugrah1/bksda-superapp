export default function BmnAssetsLoading() {
  return (
    <div className="p-6 md:p-10 space-y-6 animate-pulse">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="space-y-2">
          <div className="h-9 w-72 bg-zinc-800 rounded-xl" />
          <div className="h-4 w-96 bg-zinc-900 rounded-lg" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-64 bg-zinc-900 rounded-xl" />
          <div className="h-10 w-36 bg-zinc-800 rounded-xl" />
        </div>
      </div>
      <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 bg-zinc-900/80 border-b border-zinc-800 flex gap-4">
          {[200, 180, 160, 160, 80].map((w, i) => (
            <div key={i} className={`h-4 bg-zinc-800 rounded w-[${w}px]`} />
          ))}
        </div>
        <div className="divide-y divide-zinc-800/50">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-4 flex gap-6">
              <div className="space-y-1.5 w-40">
                <div className="h-4 bg-zinc-800 rounded w-32" />
                <div className="h-3 bg-zinc-900 rounded w-20" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="h-4 bg-zinc-800 rounded w-48" />
                <div className="h-3 bg-zinc-900 rounded w-32" />
              </div>
              <div className="space-y-1.5 w-36">
                <div className="h-4 bg-zinc-800 rounded w-28" />
                <div className="h-5 bg-zinc-900 rounded-full w-16" />
              </div>
              <div className="space-y-1.5 w-40">
                <div className="h-3 bg-zinc-900 rounded w-32" />
                <div className="h-6 bg-zinc-900 rounded w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
