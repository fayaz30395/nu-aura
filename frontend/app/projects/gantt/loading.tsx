// Instant loading skeleton for Gantt chart page (shown while JS chunk loads)
export default function GanttLoading() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-44 bg-[var(--bg-surface)] rounded" />
          <div className="h-4 w-60 bg-[var(--bg-surface)] rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-[var(--bg-surface)] rounded-md" />
          <div className="h-9 w-28 bg-[var(--bg-surface)] rounded-md" />
          <div className="h-9 w-24 bg-[var(--bg-surface)] rounded-md" />
        </div>
      </div>

      {/* Gantt chart container */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg overflow-hidden">
        {/* Timeline header */}
        <div className="flex border-b border-[var(--border-main)] bg-[var(--bg-card)]">
          <div className="w-64 flex-shrink-0 p-4 border-r border-[var(--border-main)]">
            <div className="h-4 w-24 bg-[var(--bg-surface)] rounded" />
          </div>
          <div className="flex-1 flex">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex-1 p-4 border-r border-[var(--border-subtle)] last:border-r-0">
                <div className="h-3 w-12 bg-[var(--bg-surface)] rounded mx-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Gantt rows */}
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex border-b border-[var(--border-subtle)] last:border-b-0">
            {/* Task name column */}
            <div className="w-64 flex-shrink-0 p-4 border-r border-[var(--border-main)] flex items-center gap-2">
              {i % 3 === 0 && <div className="w-3 h-3 bg-[var(--bg-surface)] rounded-md flex-shrink-0" />}
              {i % 3 !== 0 && <div className="w-3 h-3 flex-shrink-0" />}
              <div className="h-4 bg-[var(--bg-surface)] rounded"
                style={{ width: `${60 + (i % 4) * 20}px` }} />
            </div>
            {/* Timeline bar column */}
            <div className="flex-1 relative p-2 flex items-center">
              <div
                className="h-6 bg-info-100 rounded absolute"
                style={{
                  left: `${10 + (i * 7) % 40}%`,
                  width: `${15 + (i * 11) % 35}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
