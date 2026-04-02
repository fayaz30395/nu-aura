// Instant loading skeleton for payroll bulk processing (shown while JS chunk loads)
export default function BulkProcessingLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="row-between">
        <div className="space-y-2">
          <div className="h-7 w-52 bg-[var(--bg-surface)] rounded" />
          <div className="h-4 w-72 bg-[var(--bg-surface)] rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-[var(--bg-surface)] rounded-md" />
          <div className="h-9 w-32 bg-[var(--bg-surface)] rounded-md" />
        </div>
      </div>

      {/* Step progress bar */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg p-4">
        <div className="row-between">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full ${i === 0 ? 'bg-[var(--bg-surface)]' : 'bg-[var(--bg-surface)]'}`} />
              <div className="space-y-1 flex-1">
                <div className="h-3 w-20 bg-[var(--bg-surface)] rounded" />
                <div className="h-2 w-16 bg-[var(--bg-surface)] rounded" />
              </div>
              {i < 3 && <div className="h-px flex-1 bg-[var(--bg-surface)] mx-2" />}
            </div>
          ))}
        </div>
      </div>

      {/* Filter / run controls */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg p-4 flex gap-4 items-end">
        <div className="space-y-1 flex-1">
          <div className="h-3 w-20 bg-[var(--bg-surface)] rounded" />
          <div className="h-9 bg-[var(--bg-surface)] rounded-md" />
        </div>
        <div className="space-y-1 flex-1">
          <div className="h-3 w-24 bg-[var(--bg-surface)] rounded" />
          <div className="h-9 bg-[var(--bg-surface)] rounded-md" />
        </div>
        <div className="space-y-1 flex-1">
          <div className="h-3 w-28 bg-[var(--bg-surface)] rounded" />
          <div className="h-9 bg-[var(--bg-surface)] rounded-md" />
        </div>
        <div className="h-9 w-28 bg-[var(--bg-surface)] rounded-md" />
      </div>

      {/* Employee table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg overflow-hidden">
        <div className="flex items-center gap-4 p-4 divider-b">
          <div className="w-4 h-4 bg-[var(--bg-surface)] rounded" />
          <div className="h-4 w-32 bg-[var(--bg-surface)] rounded" />
          <div className="h-4 w-20 bg-[var(--bg-surface)] rounded ml-auto" />
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-[var(--border-main)]">
            <div className="w-4 h-4 bg-[var(--bg-surface)] rounded" />
            <div className="w-8 h-8 bg-[var(--bg-surface)] rounded-full flex-shrink-0" />
            <div className="space-y-1 flex-1">
              <div className="h-4 w-32 bg-[var(--bg-surface)] rounded" />
              <div className="h-3 w-20 bg-[var(--bg-surface)] rounded" />
            </div>
            <div className="h-4 w-24 bg-[var(--bg-surface)] rounded" />
            <div className="h-4 w-20 bg-[var(--bg-surface)] rounded" />
            <div className="h-4 w-24 bg-[var(--bg-surface)] rounded" />
            <div className="h-5 w-16 bg-[var(--bg-surface)] rounded-full ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
