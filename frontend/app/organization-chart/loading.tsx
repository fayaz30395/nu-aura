// Instant loading skeleton for org chart (shown while JS chunk loads)
export default function OrgChartLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="row-between">
        <div className="space-y-2">
          <div className="h-7 w-44 bg-[var(--bg-surface)] rounded"/>
          <div className="h-4 w-56 bg-[var(--bg-surface)] rounded"/>
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-32 bg-[var(--bg-surface)] rounded-md"/>
          <div className="h-9 w-9 bg-[var(--bg-surface)] rounded-md"/>
          <div className="h-9 w-9 bg-[var(--bg-surface)] rounded-md"/>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex gap-4">
        <div className="h-9 w-56 bg-[var(--bg-surface)] rounded-md"/>
        <div className="h-9 w-36 bg-[var(--bg-surface)] rounded-md"/>
      </div>

      {/* Org chart tree skeleton */}
      <div
        className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl p-8 min-h-96 flex flex-col items-center gap-8">
        {/* Root node */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-16 h-16 bg-[var(--bg-surface)] rounded-full"/>
          <div className="h-4 w-28 bg-[var(--bg-surface)] rounded mt-2"/>
          <div className="h-3 w-20 bg-[var(--bg-surface)] rounded"/>
        </div>

        {/* Connector */}
        <div className="w-px h-8 bg-[var(--bg-surface)]"/>

        {/* Second level */}
        <div className="flex gap-16 items-start">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 bg-[var(--bg-surface)] rounded-full"/>
              <div className="h-3 w-24 bg-[var(--bg-surface)] rounded mt-1"/>
              <div className="h-3 w-16 bg-[var(--bg-surface)] rounded"/>

              {/* Third level children */}
              <div className="w-px h-6 bg-[var(--bg-surface)] mt-2"/>
              <div className="flex gap-8 items-start">
                {[...Array(2)].map((_, j) => (
                  <div key={j} className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 bg-[var(--bg-surface)] rounded-full"/>
                    <div className="h-3 w-20 bg-[var(--bg-surface)] rounded mt-1"/>
                    <div className="h-2 w-14 bg-[var(--bg-surface)] rounded"/>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
