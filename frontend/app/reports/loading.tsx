// Instant loading skeleton for reports page (shown while JS chunk loads)
export default function ReportsLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-[var(--bg-surface)] rounded" />
          <div className="h-4 w-56 bg-[var(--bg-surface)] rounded" />
        </div>
        <div className="h-9 w-32 bg-[var(--bg-surface)] rounded-md" />
      </div>

      {/* Filter bar */}
      <div className="flex gap-4">
        <div className="h-9 w-36 bg-[var(--bg-surface)] rounded-md" />
        <div className="h-9 w-36 bg-[var(--bg-surface)] rounded-md" />
        <div className="h-9 w-28 bg-[var(--bg-surface)] rounded-md" />
        <div className="h-9 w-24 bg-[var(--bg-surface)] rounded-md ml-auto" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg p-4 space-y-2">
            <div className="h-3 w-24 bg-[var(--bg-surface)] rounded" />
            <div className="h-7 w-16 bg-[var(--bg-surface)] rounded" />
          </div>
        ))}
      </div>

      {/* Main chart */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-40 bg-[var(--bg-surface)] rounded" />
          <div className="flex gap-2">
            <div className="h-6 w-16 bg-[var(--bg-surface)] rounded" />
            <div className="h-6 w-16 bg-[var(--bg-surface)] rounded" />
            <div className="h-6 w-16 bg-[var(--bg-surface)] rounded" />
          </div>
        </div>
        <div className="h-64 bg-[var(--bg-surface)] rounded-lg" />
      </div>

      {/* Data table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
          <div className="h-5 w-28 bg-[var(--bg-surface)] rounded" />
          <div className="h-8 w-24 bg-[var(--bg-surface)] rounded-md" />
        </div>
        {/* Table header */}
        <div className="flex items-center gap-4 px-4 py-3 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
          {[40, 28, 24, 20, 20].map((w, i) => (
            <div key={i} className={`h-3 w-${w} bg-[var(--bg-surface)] rounded`} />
          ))}
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border-main)]">
            <div className="h-4 w-40 bg-[var(--bg-surface)] rounded" />
            <div className="h-4 w-28 bg-[var(--bg-surface)] rounded" />
            <div className="h-4 w-24 bg-[var(--bg-surface)] rounded" />
            <div className="h-4 w-20 bg-[var(--bg-surface)] rounded" />
            <div className="h-5 w-16 bg-[var(--bg-surface)] rounded-full ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
