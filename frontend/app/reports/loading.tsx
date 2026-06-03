// Instant loading skeleton for the reports hub (shown while the JS chunk loads).
// Mirrors the real Aura layout — page header, 3-col saved-report card grid, and
// the scheduled-deliveries table — so the shimmer matches what resolves in.
export default function ReportsLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl animate-pulse px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 rounded-[var(--r-sm)] bg-[var(--surface-hover)]" />
          <div className="h-4 w-80 rounded-[var(--r-sm)] bg-[var(--surface-hover)]" />
        </div>
        <div className="flex shrink-0 gap-2">
          <div className="h-9 w-28 rounded-[var(--r-control)] bg-[var(--surface-hover)]" />
          <div className="h-9 w-32 rounded-[var(--r-control)] bg-[var(--surface-hover)]" />
        </div>
      </div>

      {/* Saved reports section label */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="h-5 w-32 rounded-[var(--r-sm)] bg-[var(--surface-hover)]" />
          <div className="h-3 w-44 rounded-[var(--r-sm)] bg-[var(--surface-hover)]" />
        </div>

        {/* 3-col saved-report card grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="rounded-[var(--r-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 shadow-[var(--sh-sm)]"
            >
              <div className="mb-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-[38px] w-[38px] rounded-[10px] bg-[var(--surface-hover)]" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-28 rounded-[var(--r-sm)] bg-[var(--surface-hover)]" />
                    <div className="h-4 w-14 rounded-aura-sm bg-[var(--surface-hover)]" />
                  </div>
                </div>
                <div className="h-4 w-4 rounded bg-[var(--surface-hover)]" />
              </div>
              <div className="h-[52px] rounded-[var(--r-sm)] bg-[var(--surface-hover)]" />
              <div className="mt-3 flex items-center justify-between border-t border-[var(--border-soft)] pt-3">
                <div className="h-3 w-20 rounded-[var(--r-sm)] bg-[var(--surface-hover)]" />
                <div className="h-3.5 w-12 rounded-[var(--r-sm)] bg-[var(--surface-hover)]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scheduled deliveries table */}
      <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--border-soft)] bg-[var(--surface)] shadow-[var(--sh-sm)]">
        <div className="flex items-end justify-between gap-4 px-5 pb-4 pt-[18px]">
          <div className="space-y-1.5">
            <div className="h-5 w-44 rounded-[var(--r-sm)] bg-[var(--surface-hover)]" />
            <div className="h-3 w-56 rounded-[var(--r-sm)] bg-[var(--surface-hover)]" />
          </div>
          <div className="h-8 w-28 rounded-[var(--r-control)] bg-[var(--surface-hover)]" />
        </div>
        <div className="border-y border-[var(--border-soft)] px-5 py-3">
          <div className="h-3 w-full max-w-2xl rounded-[var(--r-sm)] bg-[var(--surface-hover)]" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-6 border-b border-[var(--border-soft)] px-5 py-3.5 last:border-b-0"
          >
            <div className="h-4 w-40 rounded-[var(--r-sm)] bg-[var(--surface-hover)]" />
            <div className="h-4 w-28 rounded-[var(--r-sm)] bg-[var(--surface-hover)]" />
            <div className="flex items-center gap-2">
              <div className="h-[26px] w-[26px] rounded-full bg-[var(--surface-hover)]" />
              <div className="h-4 w-24 rounded-[var(--r-sm)] bg-[var(--surface-hover)]" />
            </div>
            <div className="ml-auto h-4 w-12 rounded-[var(--r-sm)] bg-[var(--surface-hover)]" />
            <div className="h-5 w-12 rounded-aura-sm bg-[var(--surface-hover)]" />
            <div className="h-4 w-4 rounded bg-[var(--surface-hover)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
