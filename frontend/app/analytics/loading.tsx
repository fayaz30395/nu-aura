// Instant loading skeleton for analytics page (shown while JS chunk loads)
export default function AnalyticsLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="row-between">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-[var(--bg-surface)] rounded"/>
          <div className="h-4 w-72 bg-[var(--bg-surface)] rounded"/>
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-[var(--bg-surface)] rounded-md"/>
          <div className="h-9 w-28 bg-[var(--bg-surface)] rounded-md"/>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg p-6 space-y-4">
            <div className="h-4 w-28 bg-[var(--bg-surface)] rounded"/>
            <div className="h-8 w-20 bg-[var(--bg-surface)] rounded"/>
            <div className="h-3 w-16 bg-[var(--bg-surface)] rounded"/>
          </div>
        ))}
      </div>

      {/* Chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg p-6 space-y-4">
            <div className="h-5 w-40 bg-[var(--bg-surface)] rounded"/>
            <div className="h-56 bg-[var(--bg-surface)] rounded-lg"/>
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg overflow-hidden">
        <div className="p-4 divider-b">
          <div className="h-5 w-32 bg-[var(--bg-surface)] rounded"/>
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4 divider-b">
            <div className="h-4 w-32 bg-[var(--bg-surface)] rounded"/>
            <div className="h-4 w-24 bg-[var(--bg-surface)] rounded"/>
            <div className="h-4 w-16 bg-[var(--bg-surface)] rounded ml-auto"/>
          </div>
        ))}
      </div>
    </div>
  );
}
