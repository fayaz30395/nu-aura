// Instant loading skeleton for payroll bulk processing (shown while JS chunk loads)
export default function BulkProcessingLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-52 bg-gray-200 rounded" />
          <div className="h-4 w-72 bg-[var(--bg-surface)] rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-gray-200 rounded-md" />
          <div className="h-9 w-32 bg-gray-200 rounded-md" />
        </div>
      </div>

      {/* Step progress bar */}
      <div className="bg-white border border-[var(--border-main)] rounded-lg p-4">
        <div className="flex items-center justify-between">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full ${i === 0 ? 'bg-gray-300' : 'bg-[var(--bg-surface)]'}`} />
              <div className="space-y-1 flex-1">
                <div className="h-3 w-20 bg-gray-200 rounded" />
                <div className="h-2 w-16 bg-[var(--bg-surface)] rounded" />
              </div>
              {i < 3 && <div className="h-px flex-1 bg-gray-200 mx-2" />}
            </div>
          ))}
        </div>
      </div>

      {/* Filter / run controls */}
      <div className="bg-white border border-[var(--border-main)] rounded-lg p-4 flex gap-4 items-end">
        <div className="space-y-1 flex-1">
          <div className="h-3 w-20 bg-[var(--bg-surface)] rounded" />
          <div className="h-9 bg-gray-200 rounded-md" />
        </div>
        <div className="space-y-1 flex-1">
          <div className="h-3 w-24 bg-[var(--bg-surface)] rounded" />
          <div className="h-9 bg-gray-200 rounded-md" />
        </div>
        <div className="space-y-1 flex-1">
          <div className="h-3 w-28 bg-[var(--bg-surface)] rounded" />
          <div className="h-9 bg-gray-200 rounded-md" />
        </div>
        <div className="h-9 w-28 bg-gray-300 rounded-md" />
      </div>

      {/* Employee table */}
      <div className="bg-white border border-[var(--border-main)] rounded-lg overflow-hidden">
        <div className="flex items-center gap-4 p-4 border-b border-[var(--border-subtle)]">
          <div className="w-4 h-4 bg-gray-200 rounded" />
          <div className="h-4 w-32 bg-gray-200 rounded" />
          <div className="h-4 w-20 bg-[var(--bg-surface)] rounded ml-auto" />
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-50">
            <div className="w-4 h-4 bg-[var(--bg-surface)] rounded" />
            <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0" />
            <div className="space-y-1 flex-1">
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="h-3 w-20 bg-[var(--bg-surface)] rounded" />
            </div>
            <div className="h-4 w-24 bg-[var(--bg-surface)] rounded" />
            <div className="h-4 w-20 bg-[var(--bg-surface)] rounded" />
            <div className="h-4 w-24 bg-[var(--bg-surface)] rounded" />
            <div className="h-5 w-16 bg-gray-200 rounded-full ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
