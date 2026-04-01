// Instant loading skeleton for performance page (shown while JS chunk loads)
export default function PerformanceLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-44 bg-[var(--bg-surface)] rounded" />
          <div className="h-4 w-64 bg-[var(--bg-surface)] rounded" />
        </div>
        <div className="h-9 w-36 bg-[var(--bg-surface)] rounded-md" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border-main)] pb-0">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={`h-9 rounded-t px-4 ${i === 0 ? 'bg-[var(--bg-surface)] w-28' : 'bg-[var(--bg-surface)] w-24'}`} />
        ))}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg p-6 space-y-2">
            <div className="h-3 w-28 bg-[var(--bg-surface)] rounded" />
            <div className="h-8 w-16 bg-[var(--bg-surface)] rounded" />
            <div className="h-3 w-20 bg-[var(--bg-surface)] rounded" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg p-6 space-y-4">
            <div className="h-5 w-40 bg-[var(--bg-surface)] rounded" />
            <div className="h-56 bg-[var(--bg-surface)] rounded-lg" />
          </div>
        ))}
      </div>

      {/* Review cycles table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
          <div className="h-5 w-32 bg-[var(--bg-surface)] rounded" />
          <div className="h-8 w-28 bg-[var(--bg-surface)] rounded-md" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-[var(--border-main)]">
            <div className="space-y-1 flex-1">
              <div className="h-4 w-40 bg-[var(--bg-surface)] rounded" />
              <div className="h-3 w-28 bg-[var(--bg-surface)] rounded" />
            </div>
            <div className="h-4 w-24 bg-[var(--bg-surface)] rounded" />
            <div className="h-4 w-20 bg-[var(--bg-surface)] rounded" />
            <div className="h-5 w-20 bg-[var(--bg-surface)] rounded-full" />
            <div className="h-8 w-8 bg-[var(--bg-surface)] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
