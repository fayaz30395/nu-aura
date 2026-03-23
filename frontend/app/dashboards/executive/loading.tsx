// Instant loading skeleton for executive dashboard (shown while JS chunk loads)
export default function ExecutiveDashboardLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-52 bg-[var(--bg-surface)] rounded" />
          <div className="h-4 w-40 bg-[var(--bg-surface)] rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-[var(--bg-surface)] rounded-md" />
          <div className="h-9 w-24 bg-[var(--bg-surface)] rounded-md" />
        </div>
      </div>

      {/* Top KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-3 w-28 bg-[var(--bg-surface)] rounded" />
              <div className="h-8 w-8 bg-[var(--bg-surface)] rounded-lg" />
            </div>
            <div className="h-8 w-20 bg-[var(--bg-surface)] rounded" />
            <div className="flex items-center gap-1">
              <div className="h-3 w-8 bg-[var(--bg-surface)] rounded" />
              <div className="h-3 w-20 bg-[var(--bg-surface)] rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Second row: large chart + side metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-44 bg-[var(--bg-surface)] rounded" />
            <div className="flex gap-2">
              <div className="h-6 w-14 bg-[var(--bg-surface)] rounded" />
              <div className="h-6 w-14 bg-[var(--bg-surface)] rounded" />
            </div>
          </div>
          <div className="h-72 bg-[var(--bg-surface)] rounded-lg" />
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl p-4 space-y-4">
              <div className="h-4 w-32 bg-[var(--bg-surface)] rounded" />
              <div className="h-6 w-16 bg-[var(--bg-surface)] rounded" />
              <div className="h-2 w-full bg-[var(--bg-surface)] rounded-full">
                <div className="h-2 bg-[var(--bg-surface)] rounded-full" style={{ width: `${40 + i * 20}%` }} />
              </div>
              <div className="h-3 w-24 bg-[var(--bg-surface)] rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Third row: two equal charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl p-5 space-y-4">
            <div className="h-5 w-36 bg-[var(--bg-surface)] rounded" />
            <div className="h-52 bg-[var(--bg-surface)] rounded-lg" />
          </div>
        ))}
      </div>

      {/* Bottom: headcount table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[var(--border-subtle)]">
          <div className="h-5 w-36 bg-[var(--bg-surface)] rounded" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-6 px-4 py-3 border-b border-[var(--border-main)]">
            <div className="h-4 w-36 bg-[var(--bg-surface)] rounded" />
            <div className="h-4 w-16 bg-[var(--bg-surface)] rounded" />
            <div className="h-4 w-20 bg-[var(--bg-surface)] rounded" />
            <div className="h-4 w-16 bg-[var(--bg-surface)] rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
