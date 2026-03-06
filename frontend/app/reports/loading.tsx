// Instant loading skeleton for reports page (shown while JS chunk loads)
export default function ReportsLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-gray-200 rounded" />
          <div className="h-4 w-56 bg-gray-100 rounded" />
        </div>
        <div className="h-9 w-32 bg-gray-200 rounded-md" />
      </div>

      {/* Filter bar */}
      <div className="flex gap-3">
        <div className="h-9 w-36 bg-gray-200 rounded-md" />
        <div className="h-9 w-36 bg-gray-200 rounded-md" />
        <div className="h-9 w-28 bg-gray-200 rounded-md" />
        <div className="h-9 w-24 bg-gray-200 rounded-md ml-auto" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
            <div className="h-3 w-24 bg-gray-100 rounded" />
            <div className="h-7 w-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      {/* Main chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-40 bg-gray-200 rounded" />
          <div className="flex gap-2">
            <div className="h-6 w-16 bg-gray-100 rounded" />
            <div className="h-6 w-16 bg-gray-100 rounded" />
            <div className="h-6 w-16 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="h-64 bg-gray-100 rounded-lg" />
      </div>

      {/* Data table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="h-5 w-28 bg-gray-200 rounded" />
          <div className="h-8 w-24 bg-gray-200 rounded-md" />
        </div>
        {/* Table header */}
        <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 border-b border-gray-100">
          {[40, 28, 24, 20, 20].map((w, i) => (
            <div key={i} className={`h-3 w-${w} bg-gray-200 rounded`} />
          ))}
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-50">
            <div className="h-4 w-40 bg-gray-100 rounded" />
            <div className="h-4 w-28 bg-gray-100 rounded" />
            <div className="h-4 w-24 bg-gray-100 rounded" />
            <div className="h-4 w-20 bg-gray-100 rounded" />
            <div className="h-5 w-16 bg-gray-200 rounded-full ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
